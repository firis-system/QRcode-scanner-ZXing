function webAudioTouchUnlock(context) {
    return new Promise(function (resolve, reject) {
        if (!context || !(context instanceof(window.AudioContext || window.webkitAudioContext))) {
            reject(
                'WebAudioTouchUnlock: You need to pass an instance of AudioContext to this method call');
            return;
        }
        if (context.state === 'suspended' && 'ontouchstart' in window) {
            var unlock_1 = function () {
                context.resume().then(function () {
                    document.body.removeEventListener('touchstart', unlock_1);
                    document.body.removeEventListener('touchend', unlock_1);
                    resolve(true);
                }, function (reason) {
                    reject(reason);
                });
            };
            document.body.addEventListener('touchstart', unlock_1, false);
            document.body.addEventListener('touchend', unlock_1, false);
        } else {
            resolve(false);
        }
    });
}

function beep(vol, freq, duration, ctx) {
    webAudioTouchUnlock(ctx)
        .then(() => {
            const v = ctx.createOscillator()
            const u = ctx.createGain()
            v.connect(u)
            v.frequency.value = freq
            v.type = "square"
            u.connect(ctx.destination)
            u.gain.value = vol * 0.01
            v.start(ctx.currentTime)
            v.stop(ctx.currentTime + duration * 0.001)
        }, (err) => {
            console.error(err)
        });
}

function decodeOnce(codeReader, selectedDeviceId, audioContext) {
    codeReader.decodeFromInputVideoDevice(selectedDeviceId, 'video').then((result) => {
        console.log('Found QR code!', result);
        document.getElementById('result').textContent = result.text;
        beep(100, 520, 200, audioContext);
    }).catch((err) => {
        console.error(err)
        document.getElementById('result').textContent = err
    })
}

function decodeContinuously(codeReader, selectedDeviceId, audioContext) {
    codeReader.decodeFromInputVideoDeviceContinuously(selectedDeviceId, 'video', (result, err) => {
        if (result) {
            // properly decoded qr code
            console.log('Found QR code!', result);
            document.getElementById('result').textContent += result.text + '\n'
            beep(100, 520, 200, audioContext);
        }

        if (err) {
            // As long as this error belongs into one of the following categories
            // the code reader is going to continue as excepted. Any other error
            // will stop the decoding loop.
            //
            // Excepted Exceptions:
            //
            //  - NotFoundException
            //  - ChecksumException
            //  - FormatException

            if (err instanceof ZXing.NotFoundException) {
                console.log('No QR code found.')
            }

            if (err instanceof ZXing.ChecksumException) {
                console.log('A code was found, but it\'s read value was not valid.')
            }

            if (err instanceof ZXing.FormatException) {
                console.log('A code was found, but it was in a invalid format.')
            }
        }
    })
}

const AC = window.AudioContext || window.webkitAudioContext;
const audioContext = new AC();

window.onfocus = () => {
    audioContext.resume()
}
window.onblur = () => {
    audioContext.suspend()
}

window.addEventListener('load', function () {
    let selectedDeviceId;
    const codeReader = new ZXing.BrowserQRCodeReader()
    console.log('ZXing code reader initialized')

    codeReader.getVideoInputDevices()
        .then((videoInputDevices) => {
            const sourceSelect = document.getElementById('sourceSelect')
            selectedDeviceId = videoInputDevices[0].deviceId
            if (videoInputDevices.length >= 1) {
                videoInputDevices.forEach((element) => {
                    const sourceOption = document.createElement('option')
                    sourceOption.text = element.label
                    sourceOption.value = element.deviceId
                    sourceSelect.appendChild(sourceOption)
                })

                sourceSelect.onchange = () => {
                    selectedDeviceId = sourceSelect.value;
                };

                const sourceSelectPanel = document.getElementById('sourceSelectPanel')
                sourceSelectPanel.style.display = 'block'
            }

            document.getElementById('startButton').addEventListener('click', () => {

                const decodingStyle = document.getElementById('decoding-style').value;

                if (decodingStyle == "once") {
                    decodeOnce(codeReader, selectedDeviceId, audioContext);
                } else {
                    decodeContinuously(codeReader, selectedDeviceId, audioContext);
                }

                console.log(
                    `Started decode from camera with id ${selectedDeviceId} (${decodingStyle})`
                )

            })

            document.getElementById('resetButton').addEventListener('click', () => {
                codeReader.reset()
                document.getElementById('result').textContent = '';
                console.log('Reset.')
            })

        })
        .catch((err) => {
            console.error(err)
        })
})