function startFaceDetection() {
    const videoElement = document.getElementById('video');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                detectFaces();
            };
        })
        .catch(error => {
            console.error('Erro ao acessar a câmera: ', error);
        });
}

function detectFaces() {
    const videoElement = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const resultElement = document.getElementById('result');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    function detect() {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        faceapi.detectSingleFace(videoElement)
            .then(face => {
                context.clearRect(0, 0, canvas.width, canvas.height);

                if (face) {
                    const detections = faceapi.resizeResults(face, {
                        width: videoElement.videoWidth,
                        height: videoElement.videoHeight
                    });
                    context.beginPath();
                    context.lineWidth = 2;
                    context.strokeStyle = 'red';
                    context.rect(detections.box.x, detections.box.y, detections.box.width, detections.box.height);
                    context.stroke();

                    // Comparar o rosto detectado com as imagens
                    const imageFiles = ['./persons/sheldon.jpg', './persons/tony-stark-1.jpg'];
                    const results = [];

                    Promise.all(imageFiles.map(file => faceapi.fetchImage(file)))
                        .then(images => {
                            images.forEach(image => {
                                // const resizedImage = faceapi.resizeImage(image, detections.box.width, detections.box.height);

                                const resizedImage = faceapi.createCanvasFromMedia(image);
                                faceapi.matchDimensions(resizedImage, { width: detections.box.width, height: detections.box.height });
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


                                const detection = faceapi.detectSingleFace(resizedImage).withFaceLandmarks().withFaceDescriptor();

                                // Comparar o rosto detectado com as imagens
                                images.forEach((image, index) => {
                                    const file = imageFiles[index]; // Obtenha o nome do arquivo correspondente
                                    faceapi.detectSingleFace(image)
                                        .withFaceLandmarks()
                                        .withFaceDescriptor()
                                        .then(faceWithDescriptor => {
                                            if (faceWithDescriptor) {
                                                const descriptor = faceWithDescriptor.descriptor;
                                                const distance = faceapi.euclideanDistance(descriptor, faceWithDescriptor.descriptor);
                                                results.push({ file, distance });
                                                console.log("🚀 ~ file: main.js:81 ~ images.forEach ~ file, distance:", file, distance)
                                            } else {
                                                console.error('Nenhum rosto detectado na imagem:', file);
                                            }
                                        })
                                        .catch(error => {
                                            console.error('Erro ao computar os descritores do rosto:', error);
                                        });
                                });
                            });

                            // Ordenar os resultados pela menor distância
                            results.sort((a, b) => a.distance - b.distance);

                            // Verificar se o rosto corresponde a alguma das imagens
                            if (results.length > 0 && results[0].distance < 0.5) {
                                const closestImage = results[0].file;
                                resultElement.textContent = `Rosto correspondente: ${closestImage}`;
                            } else {
                                resultElement.textContent = 'Nenhum rosto correspondente encontrado.';
                            }
                        })
                        .catch(error => {
                            console.error('Erro ao comparar os rostos:', error);
                        });
                }

                requestAnimationFrame(detect);
            })
            .catch(error => {
                console.error('Erro na detecção de rostos:', error);
            });
    }

    detect();
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('models')
])
    .then(startFaceDetection)
    .catch(error => {
        console.error('Erro ao carregar os modelos do Face-API.js: ', error);
    });
