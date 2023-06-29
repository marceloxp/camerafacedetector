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
        this.faceMatcher = null;
    }

    async loadImages() {
        const imagePromises = this.imageFiles.map(async (file) => {
            const image = await faceapi.fetchImage(file.file);
            this.imageCache[file.file] = image;
            console.log('Imagem carregada:', file.file);
        });

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

        const bestMatch = this.faceMatcher.findBestMatch(unknownFaceDescriptor.descriptor);

        if (bestMatch.distance < 0.5) {
            resultElement.textContent = `Rosto correspondente: ${bestMatch.label}`;
        } else {
            resultElement.textContent = 'Nenhum rosto correspondente encontrado.';
        }

        console.log('RESULTADO:', resultElement.textContent);
    }

    async initializeModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('models'),
                faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
            ]);

            await this.loadImages();

            const labeledDescriptors = [];
            for (const file of this.imageFiles) {
                const image = this.imageCache[file.file];
                const detection = await faceapi
                    .detectSingleFace(image)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    const descriptor = detection.descriptor;
                    labeledDescriptors.push(
                        new faceapi.LabeledFaceDescriptors(file.name, [descriptor])
                    );
                } else {
                    console.error('Nenhum rosto detectado na imagem:', file.file);
                }
            }

            this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

            this.startFaceDetection();
        } catch (error) {
            console.error('Erro ao carregar os modelos do Face-API.js: ', error);
        }
    }
}

const faceDetection = new FaceDetection();
faceDetection.initializeModels();
