import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

console.log('Model training worker initialized');
let _globalCtx = {};
let _model = null

// 
const WEIGHTS = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1
}

const normalize = (value, min, max) => {
    const normalizeValue = (value - min) / ((max-min) || 1);
    return normalizeValue
}

const numericContextRange = (fieldValues, fieldName) => { 
    if(fieldValues && fieldValues.length > 0){
        const values = fieldValues.map((v) => v[fieldName])
        const min = Math.min(...values)
        const max = Math.max(...values)
        const mid = (max+min) / 2;
        return {
            min, 
            max,
            mid,
            values
        };
    }
    return {
        min: 0,
        max: 0,
        mid: 0,
        values: []
    }
};

const hotTakeContext = (fieldValues, fieldName) => { 
    if(fieldValues && fieldValues.length > 0){
        const values = [... new Set(fieldValues.map(v => v[fieldName]))];
        const indexMapper = Object.fromEntries(values.map((v, index) => [v, index]));
        return {values, indexMapper}
    }
    return {values: [], indexMapper: {}};
}

const makeContext = (products, users) => {
    const ages = numericContextRange(users, 'age');
    const price = numericContextRange(products, 'price');

    const colors = hotTakeContext(products, 'color');
    const categories = hotTakeContext(products, 'category');
    
    const ageStats = []
    users.forEach(user => {
        user.purchases.forEach((p) => {
            if(!ageStats[p.name]) ageStats[p.name] = {};
            ageStats[p.name].sum = (ageStats[p.name]?.sum || 0) + user.age;
            ageStats[p.name].count = (ageStats[p.name]?.count || 0) + 1
        })
    })
    // Isso é a média de idade de cada pessoa pra determinado produto;
    const productAvgAgeForm = Object.fromEntries(
        products.map( product => {
            const avg = ageStats[product.name] ?  ageStats[product.name].sum / ageStats[product.name].count : ages.mid
            
            const normalizedValue = normalize(avg, ages.min, ages.max)
            return  [product.name, normalizedValue ]
        })
    )
    return {
        products,
        users,
        productAvgAgeForm,
        colorsIndex: colors.indexMapper,
        categoriesIndex: categories.indexMapper,
        minAge: ages.min,
        maxAge: ages.max,
        minPrice: price.min,
        maxPrice: price.max,
        numCategories: categories.values.length,
        numColors: colors.values.length,
        // price + age + categories
        dimensions: 2 + categories.values.length + colors.values.length
    }
}


const oneHotWeighted = (index, length, weight) => {
    const w = weight ?? 0
    if (!length) {
        return tf.tensor1d([], 'float32')
    }
    const i = (index == null || Number.isNaN(index)) ? 0 : index
    
    // tf.oneHot(i, length): cria um vetor de tamanho length com 1 na posição i e 0 no resto.
    // .cast('float32'): converte para float (rede neural trabalha com float).
    // .mul(w): aplica peso; vira w na posição ativa, 0 nas outras.
    return tf.oneHot(i, length).cast('float32').mul(w)
}

function encodeProduct(product, context) {
    // Normalizando pra ficar de 0 a 1,
    // Aplica o peso da remocomendação
    const price = tf.tensor1d([
        normalize(
            product.price,
            context.minPrice,
            context.maxPrice,
        ) * WEIGHTS.price
    ])

    const age = tf.tensor1d([
        (
            // aqui já tá tudo noramlizado, só precisa saber qual produto é
            context.productAvgAgeForm[product.name] ?? 0.5
        ) * WEIGHTS.age
    ])

    const category = oneHotWeighted(
        context.categoriesIndex[product.category],
        context.numCategories,
        WEIGHTS.category
    )
    const color = oneHotWeighted(
        context.colorsIndex[product.color],
        context.numColors,
        WEIGHTS.color
    )
    
    return tf.concat1d(
        [price, age, category, color]
    )
} 

// Essa função vai ser usada pra retornar o perfil de compra do usuário baseado em todas as compras.
function encodeUser(user, context){
    if(user.purchases.length) {
        return tf.stack(
            user.purchases.map(product => encodeProduct(product, context))
        ).mean(0).reshape([1, context.dimensions])
    }

    const price = tf.zeros([1]) //preço é ignorado, o preço é unidimensional

    const age = tf.tensor1d([
        (normalize(user.age, context.minAge, context.maxAge)) * WEIGHTS.age
    ])

    const category = tf.zeros([context.numCategories]) //category é ignorado
    const color =  tf.zeros([context.numColors]) //color é ignorado
    
    return tf.concat1d(
        [price, age, category, color]
    ).reshape([1, context.dimensions])
}

function createTrainingData(context) {
    const inputs = []
    const labels = []
    context.users
        .filter(u => u.purchases.length)
        .forEach( user => {
            const userVector = encodeUser(user, context).dataSync()
            context.products.forEach(product => {
                const productVector = encodeProduct(product, context).dataSync()
                const label = user.purchases.some(
                    purchase => purchase.name === product.name ? 1 : 0
                )

                // combinar user + product
                inputs.push([...userVector, ...productVector])
                labels.push(label)
            })
        })
    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimension: context.dimensions * 2 // o Vezes 2 é pq são dois vetores de mesmo tamanho (50) sendo concatenados no input
        // tamanho = userVector + productVector
    }
}

// ====================================================================
// 📌 Exemplo de como um usuário é ANTES da codificação
// ====================================================================
/*
const exampleUser = {
    id: 201,
    name: 'Rafael Souza',
    age: 27,
    purchases: [
        { id: 8, name: 'Boné Estiloso', category: 'acessórios', price: 39.99, color: 'preto' },
        { id: 9, name: 'Mochila Executiva', category: 'acessórios', price: 159.99, color: 'cinza' }
    ]
};
*/

// ====================================================================
// 📌 Após a codificação, o modelo NÃO vê nomes ou palavras.
// Ele vê um VETOR NUMÉRICO (todos normalizados entre 0–1).
// Exemplo: [preço_normalizado, idade_normalizada, cat_one_hot..., cor_one_hot...]
//
// Suponha categorias = ['acessórios', 'eletrônicos', 'vestuário']
// Suponha cores      = ['preto', 'cinza', 'azul']
//
// Para Rafael (idade 27, categoria: acessórios, cores: preto/cinza),
// o vetor poderia ficar assim:
//
// [
//   0.45,            // peso do preço normalizado
//   0.60,            // idade normalizada
//   1, 0, 0,         // one-hot de categoria (acessórios = ativo)
//   1, 0, 0          // one-hot de cores (preto e cinza ativos, azul inativo)
// ]
//
// São esses números que vão para a rede neural.
// ====================================================================



// ====================================================================
// 🧠 Configuração e treinamento da rede neural
// ====================================================================

async function configureNeuralNetAndTrain(trainData){
    const model = tf.sequential()

    // Camada de entrada
    // - inputShape: Número de features por exemplo de treino (trainData.inputDim)
    //   Exemplo: Se o vetor produto + usuário = 20 números, então inputDim = 20
    // - units: 128 neurônios (muitos "olhos" para detectar padrões)
    // - activation: 'relu' (mantém apenas sinais positivos, ajuda a aprender padrões não-lineares)

    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimension],
            units: 128,
            activation: 'relu'
        })
    )

    // Camada oculta 1
    // - 64 neurônios (menos que a primeira camada: começa a comprimir informação)
    // - activation: 'relu' (ainda extraindo combinações relevantes de features)
    model.add(
        tf.layers.dense({
            units: 64,
            activation: 'relu'
        })
    )
    
    // Camada oculta 2
    // - 32 neurônios (mais estreita de novo, destilando as informações mais importantes)
    //   Exemplo: De muitos sinais, mantém apenas os padrões mais fortes
    // - activation: 'relu'
    model.add(
        tf.layers.dense({
            units: 32,
            activation: 'relu'
        })
    )

    // Camada de saída
    // - 1 neurônio porque vamos retornar apenas uma pontuação de recomendação
    // - activation: 'sigmoid' comprime o resultado para o intervalo 0–1
    //   Exemplo: 0.9 = recomendação forte, 0.1 = recomendação fraca
    model.add(
        tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
        })
    )

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    })

    await model.fit(trainData.xs,trainData.ys, {
        epochs: 100,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    })
    return model
}

async function trainModel({ users }) {
    console.log('Training model with users:', users)

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });
    const products = await (await fetch('/data/products.json')).json();
    const context = makeContext(products, users);
    context.productVectors = products.map((product) => {
        return {
            name: product.name,
            meta: {...product},
            vector: encodeProduct(product, context).dataSync()
        }
    })
    const trainData = createTrainingData(context)
    _model = await configureNeuralNetAndTrain(trainData)

    _globalCtx = context;
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}
function recommend(user, ctx) {
    if(!_model) return
    const context = _globalCtx
     // 1️⃣ Converta o usuário fornecido no vetor de features codificadas
    //    (preço ignorado, idade normalizada, categorias ignoradas)
    //    Isso transforma as informações do usuário no mesmo formato numérico
    //    que foi usado para treinar o modelo.

    const userVector = encodeUser(user, context).dataSync()
    const inputs = context.productVectors.map(({vector}) => {
        return [...userVector, ...vector]
    })

    

    const inputVector = tf.tensor2d(inputs)


    const predictions = _model.predict(inputVector) 

    const scores = predictions.dataSync()

    const recommendations = context.productVectors.map((item, index) =>{
        return {
            ...item.meta,
            name: item.name,
            score: scores[index] // previsão do modelo
        }
    })
    const sortedItems = recommendations.sort((a, b) => b.score - a.score)

    // Envia pra UI
    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });
}


const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: d => recommend(d.user, _globalCtx),
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
