importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;

let _model = null;
let _labels = [];
// É a dimensão que o modelo do yol aceita.
const _INPUT_DIMENSION = 640;
const CLASS_THRESHOLD = 0.4;

async function loadModelAndLabels(){
    await tf.ready();

    _labels = await (await fetch(LABELS_PATH)).json();
    _model = await tf.loadGraphModel(MODEL_PATH);

    // warmup
    // o Yolo é [1, 640, 640, 3]
    // Ele tá gerando um tensor com valor 1 dessa forma:
    // [array de tamanho 1, array de tamanho 640, array de tamanho 640, array de tamanho 3 ]
    // A primeira inferência de um modelo de ML costuma ser lenta (compilação de shaders WebGL/GPU, alocação de memória, etc.). Rodar uma predição “de mentira” no carregamento faz essa demora acontecer antes do jogo, não na hora em que o pato aparece na tela.
    const dummyInput = tf.ones(_model.inputs[0].shape);
    await _model.executeAsync(dummyInput);

    tf.dispose(dummyInput);

    postMessage({type: 'model-loaded'});
}
/*
tf.browser.fromPixels(): converte ImageBitmap/ImageData pra tensor [H,W,3]
tf.image.resizeBilinear(): redimensiona pra [640, 640]
.div(255): normaliza de 0 a 1
.expandDims(0): adiciona dimensão batch

O tf.tdy é pra n ter que usar disposal toda hora. porque a cada fluent api é um tensor criado envolvido no processo.
*/
function preprocessImage(input) {
    return tf.tidy(() => {
        const image = tf.browser.fromPixels(input);
        return tf.image.resizeBilinear(image, [_INPUT_DIMENSION, _INPUT_DIMENSION] ).div(255).expandDims(0);
    });
}

async function runInterference(tensor) {
    const output = await _model.executeAsync(tensor);
    tf.dispose(tensor);

    const [boxes, scores, classes] = output.slice(0, 3);
    const [boxesData, scoresData, classesData] = await Promise.all([
        boxes.data(),
        scores.data(),
        classes.data()
    ]);

    output.forEach((t) => t.dispose());
    return {
        boxes: boxesData,
        scores: scoresData,
        classes: classesData
    };
}
/**
 * Filtra e processa as predições:
 * - Aplica o limiar de confiança (CLASS_THRESHOLD)
 * - Filtra apenas a classe desejada (exemplo: 'kite')
 * - Converte coordenadas normalizadas para pixels reais
 * - Calcula o centro do bounding box
 *
 * Uso de generator (function*):
 * - Permite enviar cada predição assim que processada, sem criar lista intermediária
 */
function *processPrediction({boxes, scores, classes}, width, height){
    for (let index = 0; index < scores.length; index++) {
        if (scores[index] < CLASS_THRESHOLD) continue;

        const label = _labels[classes[index]];
        if (label !== 'kite') continue;

        let [x1, y1, x2, y2] = boxes.slice(index * 4, (index + 1) * 4);

        x1 *= width;
        x2 *= width;
        y1 *= height;
        y2 *= height;

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const centerX = x1 + boxWidth/2;
        const centerY = y1 + boxHeight/2;

        yield{
            x: centerX,
            y: centerY,
            score: (scores[index] * 100).toFixed(2),
        };
    }
}

loadModelAndLabels();
let busy = false;
self.onmessage = async ({ data }) => {
    if (data.type !== 'predict') return;
    if (busy) return;
    if (!_model) return;
    busy = true;

    const input = preprocessImage(data.image);
    const {width, height} = data.image;

    // Isso tá no workerThreads e ainda tem asyncronicidade. Ou seja, pode ter overflow de mempória, pq pode ter stack dessas funções em execução.
    const inferenceResults = await runInterference(input);
    busy = false;

    for (const prediction of processPrediction(inferenceResults, width, height)) {
        postMessage({
            type: 'prediction',
            ...prediction
        });
    }
};

console.log('🧠 YOLOv5n Web Worker initialized');
