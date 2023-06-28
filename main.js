// Função para iniciar a detecção de rostos
function startFaceDetection() {
    // Obter o elemento de vídeo
    const videoElement = document.getElementById('video');

    // Iniciar a captura de vídeo
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

// Função para detectar rostos no vídeo
function detectFaces() {
    const videoElement = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // Configurar o canvas com as dimensões do vídeo
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Detectar rostos a cada quadro do vídeo
    function detect() {
        context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
        faceapi.detectAllFaces(videoElement)
            .then(faces => {
                // Limpar o canvas
                context.clearRect(0, 0, videoWidth, videoHeight);

                // Desenhar retângulos em volta dos rostos detectados
                faces.forEach(face => {
                    const { x, y, width, height } = face.box;
                    const box = {
                        x: x * videoWidth / videoElement.clientWidth,
                        y: y * videoHeight / videoElement.clientHeight,
                        width: width * videoWidth / videoElement.clientWidth,
                        height: height * videoHeight / videoElement.clientHeight
                    };
                    context.beginPath();
                    context.lineWidth = 2;
                    context.strokeStyle = 'red';
                    context.rect(box.x, box.y, box.width, box.height);
                    context.stroke();
                });

                // Chamada recursiva para detectar rostos no próximo quadro
                requestAnimationFrame(detect);
            })
            .catch(error => {
                console.error('Erro na detecção de rostos:', error);
            });
    }

    // Iniciar a detecção de rostos
    detect();
}

// Carregar os modelos do Face-API.js e iniciar a detecção de rostos
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('models')
])
    .then(startFaceDetection)
    .catch(error => {
        console.error('Erro ao carregar os modelos do Face-API.js: ', error);
    });
