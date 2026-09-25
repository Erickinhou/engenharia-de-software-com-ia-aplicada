import { buildLayout } from './layout';

export default async function main(game) {
    const container = buildLayout(game.app);
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    game.pause();

    game.stage.aim.visible = false;

    worker.onmessage = ({ data }) => {
        const { type } = data;

        if (type === 'prediction') {
            console.log(`🎯 AI predicted at: (${data.x}, ${data.y})`);
            container.updateHUD(data);
            game.stage.aim.visible = true;

            game.stage.aim.setPosition(data.x, data.y);
            const position = game.stage.aim.getGlobalPosition();

            game.handleClick({
                global: position,
            });
        }

        if (type === 'model-loaded') {
            game.pause();

            setInterval(async () => {
                const canvas = game.app.renderer.extract.canvas(game.stage);
                const bitmap = await createImageBitmap(canvas);

                worker.postMessage({
                    type: 'predict',
                    image: bitmap,
                }, [bitmap]);
            }, 150);
        }
    };

    return container;
}
