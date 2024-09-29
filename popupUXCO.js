document.addEventListener('DOMContentLoaded', function () {
    // Charger le nom complet à partir du Local Storage
    document.getElementById('fullName').value = localStorage.getItem('fullName') || '';

    // Mettre à jour le nom complet dans le Local Storage à chaque modification
    document.getElementById('fullName').addEventListener('input', function () {
        localStorage.setItem('fullName', this.value);
    });

    let impactValue = ''; // Variable pour stocker l'impact sélectionné

    // Écouteurs d'événements pour les boutons d'impact
    document.getElementById('impactMinor').addEventListener('click', function () {
        impactValue = 'Mineur';
        highlightSelectedImpact('impactMinor');
    });

    document.getElementById('impactIntermediate').addEventListener('click', function () {
        impactValue = 'Intermédiaire';
        highlightSelectedImpact('impactIntermediate');
    });

    document.getElementById('impactMajor').addEventListener('click', function () {
        impactValue = 'Majeur';
        highlightSelectedImpact('impactMajor');
    });

    // Fonction pour mettre en surbrillance le bouton sélectionné
    function highlightSelectedImpact(selectedId) {
        document.querySelectorAll('.impact-button').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(selectedId).classList.add('active');
    }

    // Bouton pour obtenir les informations de l'onglet actif
    document.getElementById('myButton').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                var activeTab = tabs[0];
                var activeTabURL = activeTab.url;

                try {
                    var urlObject = new URL(activeTabURL);
                    var domaine = urlObject.hostname;

                    document.getElementById('urlDisplay').value = activeTabURL;
                    document.getElementById('domainDisplay').value = domaine;

                    console.log("URL de l'onglet actif :", activeTabURL);
                    console.log("Domaine de l'onglet actif :", domaine);
                } catch (e) {
                    console.error("Erreur lors de l'analyse de l'URL :", e);
                }
            } else {
                console.error("Aucun onglet actif trouvé.");
            }
        });
    });

    // Bouton pour envoyer le bug
    document.getElementById('sendBugButton').addEventListener('click', function () {
        var fullName = document.getElementById('fullName').value.trim();  
        var url = document.getElementById('urlDisplay').value.trim();
        var domain = document.getElementById('domainDisplay').value.trim();
        var bugDescription = document.getElementById('bugDescription').value.trim();
        var sendBugButton = document.getElementById('sendBugButton');

        // Vérifier si le champ "Description du bug" est vide
        if (bugDescription === '') {
            document.getElementById('bugDescription').classList.add('is-invalid');
            document.querySelector('.invalid-feedback').style.display = 'block';
            return;
        } else {
            document.getElementById('bugDescription').classList.remove('is-invalid');
            document.querySelector('.invalid-feedback').style.display = 'none';
        }

        if (fullName && url && domain && bugDescription && impactValue) {  
            sendBugButton.innerHTML = `Envoi du bug... <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
            sendBugButton.disabled = true; 

            var formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('domain', domain);
            formData.append('url', url);
            formData.append('bugDescription', bugDescription);
            formData.append('impact', impactValue);  // Ajouter l'impact

            console.log('Données envoyées :', {fullName, domain, url, bugDescription, impactValue}); // Debug

            fetch('https://script.google.com/macros/s/AKfycbyk4fpPeqo2uc9GNwCL9YemZlCESRsSOl4xmwCCHrpp9gzcHj1qnxUd4GYUMcJeFu3y/exec', {  
                method: 'POST',
                body: formData,
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de l\'envoi des données');
                }
                return response.text();
            })
            .then(data => {
                console.log('Succès :', data);
                // Arrêter le loader et afficher l'overlay de confirmation
                sendBugButton.innerHTML = 'Envoyer le bug';
                document.getElementById('confirmationOverlay').classList.add('active');
            })
            .catch(error => console.error('Erreur lors de l\'envoi des données :', error))
            .finally(() => {
                sendBugButton.disabled = false; // Activer à nouveau le bouton
            });
        } else {
            console.error("Tous les champs ne sont pas remplis correctement.");
        }
    });

    // Gestion du bouton "Soumettre un autre bug"
    document.getElementById('submitAnotherBugButton').addEventListener('click', function () {
        // Masquer l'overlay
        document.getElementById('confirmationOverlay').classList.remove('active');

        // Réinitialiser les champs du formulaire sauf le nom complet
        document.getElementById('urlDisplay').value = '';
        document.getElementById('domainDisplay').value = '';
        document.getElementById('bugDescription').value = '';
        impactValue = '';  // Réinitialiser l'impact
        document.querySelectorAll('.impact-button').forEach(button => button.classList.remove('active')); // Désactiver tous les boutons
    });
});
