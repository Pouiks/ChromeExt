document.addEventListener('DOMContentLoaded', function () {
    let impactValue = '';
    let screenshotDataUrl = ''; // Va contenir la DataURL du screenshot réduit

    // Récupérer les variables d'environnement depuis le manifest
    const manifest = chrome.runtime.getManifest();
    const API_URL = manifest.env.URL_API;
    const UXCO_SHEET = manifest.env.UXCO_SHEET;

    console.log('API URL:', API_URL);
    console.log('Google Sheets URL:', UXCO_SHEET);

    // Fonction pour capturer et redimensionner le screenshot
    function resizeImage(base64Str, maxWidth = 800, maxHeight = 600) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.floor((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.floor((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/png')); // Résoudre avec la DataURL de l'image redimensionnée
            };
        });
    }

    // Fonction pour afficher et masquer le loader
    function showLoader() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    function hideLoader() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Capture du screenshot
    document.getElementById('captureScreenshotButton').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, async function (dataUrl) {
                if (chrome.runtime.lastError) {
                    console.error("Erreur lors de la capture de l'écran : " + chrome.runtime.lastError.message);
                    return;
                }

                if (dataUrl) {
                    console.log("Capture d'écran réussie, réduction de l'image...", dataUrl);
                    screenshotDataUrl = await resizeImage(dataUrl);
                    console.log("Données du screenshot après réduction : ", screenshotDataUrl);

                    const successIcon = document.getElementById('screenshotSuccessIcon');
                    successIcon.style.display = 'inline';
                    setTimeout(() => {
                        successIcon.style.display = 'none';
                    }, 3000);
                } else {
                    console.error("Erreur lors de la capture d'écran.");
                }
            });
        });
    });

    // Obtenir les informations de l'onglet actif
    document.getElementById('myButton').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                const activeTabURL = activeTab.url;

                try {
                    const urlObject = new URL(activeTabURL);
                    const domain = urlObject.hostname;

                    document.getElementById('urlDisplay').value = activeTabURL;
                    document.getElementById('domainDisplay').value = domain;
                } catch (e) {
                    console.error("Erreur lors de l'analyse de l'URL :", e);
                }
            } else {
                console.error("Aucun onglet actif trouvé.");
            }
        });
    });

    // Gérer les boutons d'impact
    document.getElementById('impactMinor').addEventListener('click', function () {
        impactValue = 'Peu gênant';
    });

    document.getElementById('impactIntermediate').addEventListener('click', function () {
        impactValue = 'Perturbant';
    });

    document.getElementById('impactMajor').addEventListener('click', function () {
        impactValue = 'Grave';
    });

    // Envoi des données du bug et screenshot
    document.getElementById('sendBugButton').addEventListener('click', async function () {
        let fullName = document.getElementById('fullName').value.trim();
        let urlDisplay = document.getElementById('urlDisplay').value.trim();
        let domainName = document.getElementById('domainDisplay').value.trim();
        let bugDescription = document.getElementById('bugDescription').value.trim();
        let caseNumber = document.getElementById('caseNumber').value.trim();

        if (fullName === '' || urlDisplay === '' || domainName === '' || bugDescription === '' || caseNumber === '' || impactValue === '') {
            console.error("Tous les champs ne sont pas remplis correctement ou l'impact n'est pas sélectionné.");
            alert("Merci de remplir tous les champs et de sélectionner l'impact du bug.");
            return;
        }

        showLoader();

        const bugData = {
            domainName: domainName,
            screenshot: screenshotDataUrl || null,
            bugs: [
                {
                    url: urlDisplay,
                    description: bugDescription,
                    impact: impactValue,
                    date: new Date().toISOString(),
                    reportedBy: fullName
                }
            ]
        };

        try {
            // Étape 1 : Envoi du bug au serveur
            const response = await fetch(`${API_URL}/api/bugs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bugData)
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi des données');
            }
            
            const result = await response.json();
            const bugId = result.bugData._id;
            const screenshotUrl = result.bugData.screenshotUrl;

            console.log('Bug envoyé avec succès, ID du bug :', bugId, 'URL du screenshot :', screenshotUrl);

            // Étape 2 : Envoi des données à Google Sheets
            await fetch(UXCO_SHEET, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    fullName: fullName,
                    domain: domainName,
                    url: urlDisplay,
                    bugDescription: bugDescription,
                    impact: impactValue,
                    caseNumber: caseNumber,
                    screenshotUrl: screenshotUrl
                })
            });
            
            console.log('Données envoyées à Google Sheets.');
            hideLoader();
            document.getElementById('confirmationOverlay').classList.add('active');

        } catch (error) {
            console.error('Erreur lors de l\'envoi au serveur ou à Google Sheets :', error);
            hideLoader();
        }
    });

    // Réinitialiser le formulaire et revenir à l'écran initial
    document.getElementById('submitAnotherBugButton').addEventListener('click', function () {
        document.getElementById('urlDisplay').value = '';
        document.getElementById('domainDisplay').value = '';
        document.getElementById('caseNumber').value = '';
        document.getElementById('bugDescription').value = '';
        impactValue = '';
        document.getElementById('confirmationOverlay').classList.remove('active');
    });
});
