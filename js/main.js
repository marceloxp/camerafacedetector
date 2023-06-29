class FaceDetection {
    constructor() {
        this.imageCache = {};
        this.imageFiles = [
            {
                name: 'Sheldon',
                files: [
                    './persons/sheldon-001.png',
                    './persons/sheldon-002.png',
                    './persons/sheldon-003.png',
                    './persons/sheldon-004.png'
                ]
            },
            {
                name: 'Tony Stark',
                files: [
                    './persons/tony-stark-001.png',
                    './persons/tony-stark-002.png',
                    './persons/tony-stark-003.png',
                    './persons/tony-stark-004.png'
                ]
            },
        ];

        this.faceMatcher = null;
    }

    async loadImages() {
        const imagePromises = [];

        for (const fileGroup of this.imageFiles) {
            const imageGroupPromises = fileGroup.files.map(async (file) => {
                const image = await faceapi.fetchImage(file);
                this.imageCache[file] = image;
                console.log('Imagem carregada:', file);
            });

            imagePromises.push(...imageGroupPromises);
        }

        await Promise.all(imagePromises);
    }


    async startFaceDetection() {
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
                } else {
                    if (resultElement.textContent != 'Nenhum rosto detectado.') {
                        resultElement.textContent = 'Nenhum rosto detectado.';
                    }
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

        const unknownFaceDescriptor = await faceapi
            .detectSingleFace(videoElement)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!unknownFaceDescriptor) {
            return;
        }

        const descriptors = unknownFaceDescriptor.descriptor;
        const bestMatch = this.faceMatcher.findBestMatch(descriptors);

        console.log("🚀 ~ file: main.js:119 ~ bestMatch.distance:", bestMatch.label, bestMatch.distance)
        if (bestMatch.distance < 0.65) {
            resultElement.textContent = `Rosto correspondente: ${bestMatch.label}`;
        } else {
            resultElement.textContent = 'Nenhum rosto correspondente encontrado.';
        }

        console.log('RESULTADO:', resultElement.textContent);
    }

    async initializeModels() {
        try {
            box.show('Inicializando modelos...');
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('models'),
                faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
            ]);

            box.show('Carregando imagens...');
            await this.loadImages();

            box.show('Montando descritores...');
            const labeledDescriptors = [];

            for (const fileGroup of this.imageFiles) {
                const imageGroupDescriptors = [];
                
                let k = 1;
                for (const file of fileGroup.files) {
                    const image = this.imageCache[file];
                    const detection = await faceapi
                        .detectSingleFace(image)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        const descriptor = detection.descriptor;
                        imageGroupDescriptors.push(descriptor);
                    } else {
                        console.error('Nenhum rosto detectado na imagem:', file);
                    }
                }

                if (imageGroupDescriptors.length > 0) {
                    for (const descriptor of imageGroupDescriptors) {
                        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(`${fileGroup.name}`, [descriptor]));
                    }
                }
                k++;
            }

            box.show('Carregando rostos...');
            this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

            box.show('Quase pronto!');
            this.startFaceDetection();

            box.hide();
        } catch (error) {
            console.error('Erro ao carregar os modelos do Face-API.js: ', error);
        }
    }
}

const faceDetection = new FaceDetection();
faceDetection.initializeModels();
