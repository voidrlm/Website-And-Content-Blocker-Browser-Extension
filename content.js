block();
chrome.runtime.onMessage.addListener(function () {
    activateBlock();
});

document.body.addEventListener('click', block);
document.body.addEventListener('keyup', block);
function block() {
    let currentDomainBlocked = JSON.parse(localStorage.getItem('blockThisSite')) || false;

    if (currentDomainBlocked) {
        let elements = document.querySelectorAll('html');
        for (let t = 0; t < elements.length; t++) {
            elements[t].style.display = 'none';
        }
        let text = currentDomainBlocked ? 'DOMAIN' : 'CONTENT';
        document.title = text + ' BLOCKED';
    }
}
function activateBlock() {
    if (JSON.parse(localStorage.getItem('blockThisSite'))) {
        localStorage.setItem('blockThisSite', false);
        window.location.reload();
    } else {
        localStorage.setItem('blockThisSite', true);
        block();
    }
}
