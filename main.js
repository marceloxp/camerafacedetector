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

async function detectFaces() {
    const videoElement = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const resultElement = document.getElementById('result');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    async function detect() {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        try {
            const face = await faceapi.detectSingleFace(videoElement);

            if (face) {
                context.clearRect(0, 0, canvas.width, canvas.height);
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

                for (const file of imageFiles) {
                    const image = await faceapi.fetchImage(file);
                    console.log('Imagem carregada:', file);

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

                    const detection = await faceapi.detectSingleFace(resizedImage).withFaceLandmarks().withFaceDescriptor();
                    if (detection) {
                        // console.log('Descritor do rosto:', detection.descriptor);
                        const descriptor = detection.descriptor;
                        try {
                            const faceWithDescriptor = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
                            if (faceWithDescriptor) {
                                const distance = faceapi.euclideanDistance(descriptor, faceWithDescriptor.descriptor);
                                results.push({ file, distance });
                                console.log("🚀 ~ file: main.js:81 ~ images.forEach ~ file, distance:", file, distance);
                            } else {
                                console.error('Nenhum rosto detectado na imagem:', file);
                            }
                        } catch (error) {
                            console.error('Erro ao computar os descritores do rosto:', error);
                        }
                    }
                }

                // Ordenar os resultados pela menor distância
                let distancesStr = '';
                if (results.length > 1) {
                    console.log("Before order:", results)
                    results.sort((a, b) => a.distance - b.distance);
                    console.log("After order:", results);

                    distancesStr = `${results.map(({ file, distance }) => `${file} - ${distance.toFixed(2)}`).join('\n')}`;

                    // Verificar se o rosto corresponde a alguma das imagens
                    if (results.length > 0 && results[0].distance < 0.5) {
                        const closestImage = results[0].file;
                        resultElement.textContent = `Rosto correspondente: ${closestImage}`;
                    } else {
                        resultElement.textContent = 'Nenhum rosto correspondente encontrado.';
                    }
                } else {
                    resultElement.textContent = 'Nada processado no momento.';
                }
                resultElement.textContent += ` distancesStr: ${distancesStr}`;
                console.log('RESULTADO:', resultElement.textContent);
            }
        } catch (error) {
            console.error('Erro na detecção de rostos:', error);
        }

        requestAnimationFrame(detect);
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
