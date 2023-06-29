class FaceDetection {
    constructor() {
        this.imageCache = {};
        this.imageFiles = [
            {
                name: 'Sheldon',
                file: './persons/sheldon.jpg',
            },
            {
                name: 'Tony Stark',
                file: './persons/tony-stark-1.jpg',
            },
        ];
    }

    async loadImages() {
        for (const file of this.imageFiles) {
            const image = await faceapi.fetchImage(file.file);
            this.imageCache[file.file] = image;
            console.log('Imagem carregada:', file.file);
        }
    }

    async startFaceDetection() {
        await this.loadImages();

        const videoElement = document.getElementById('video');

        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                videoElement.srcObject = stream;
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    this.detectFaces();
                };
            })
            .catch((error) => {
                console.error('Erro ao acessar a câmera: ', error);
            });
    }

    async detectFaces() {
        const videoElement = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        const resultElement = document.getElementById('result');

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const detect = async () => {
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            try {
                const face = await faceapi.detectSingleFace(videoElement);
                if (face) {
                    await this.processFace(context, canvas, face, videoElement, resultElement);
                }
            } catch (error) {
                console.error('Erro na detecção de rostos:', error);
            }

            requestAnimationFrame(detect);
        };

        detect();
    }

    async processFace(context, canvas, face, videoElement, resultElement) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const detections = faceapi.resizeResults(face, {
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
        });
        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = 'red';
        context.rect(
            detections.box.x,
            detections.box.y,
            detections.box.width,
            detections.box.height
        );
        context.stroke();

        const results = [];

        for (const file of this.imageFiles) {
            const image = this.imageCache[file.file];
            console.log('Imagem a comparar:', file.file);

            const resizedImage = faceapi.createCanvasFromMedia(image);
            faceapi.matchDimensions(resizedImage, {
                width: detections.box.width,
                height: detections.box.height,
            });
            const resizedContext = resizedImage.getContext('2d');
            resizedContext.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                0,
                0,
                resizedImage.width,
                resizedImage.height
            );

            const detection = await faceapi
                .detectSingleFace(resizedImage)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (detection) {
                await this.processCompare(detection, image, results, file);
            }
        }

        let distancesStr = '';
        if (results.length > 1) {
            console.log('Before order:', results);
            results.sort((a, b) => a.distance - b.distance);
            console.log('After order:', results);

            distancesStr = `${results
                .map(({ file, distance }) => `${file.name} - ${distance.toFixed(2)}`)
                .join('\n')}`;

            if (results.length > 0 && results[0].distance < 0.5) {
                const closestImage = results[0];
                resultElement.textContent = `Rosto correspondente: ${closestImage.file.name}`;
            } else {
                resultElement.textContent = 'Nenhum rosto correspondente encontrado.';
            }
        } else {
            resultElement.textContent = 'Nada processado no momento.';
        }
        resultElement.textContent += `  - distancesStr: ${distancesStr}`;
        console.log('RESULTADO:', resultElement.textContent);
    }

    async processCompare(detection, image, results, file) {
        const descriptor = detection.descriptor;
        try {
            const faceWithDescriptor = await faceapi
                .detectSingleFace(image)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (faceWithDescriptor) {
                const distance = faceapi.euclideanDistance(
                    descriptor,
                    faceWithDescriptor.descriptor
                );
                results.push({ file, distance });
                console.log(
                    '🚀 ~ file: main.js:81 ~ images.forEach ~ file, distance:',
                    file,
                    distance
                );
            } else {
                console.error('Nenhum rosto detectado na imagem:', file);
            }
        } catch (error) {
            console.error('Erro ao computar os descritores do rosto:', error);
        }
    }

    async initializeModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('models'),
                faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
            ]);

            this.startFaceDetection();
        } catch (error) {
            console.error('Erro ao carregar os modelos do Face-API.js: ', error);
        }
    }
}

const faceDetection = new FaceDetection();
faceDetection.initializeModels();
