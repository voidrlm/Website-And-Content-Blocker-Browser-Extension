block();
chrome.runtime.onMessage.addListener(function () {
    activateBlock();
});

document.body.addEventListener('click', block);
document.body.addEventListener('keyup', block);
function block() {}
function activateBlock() {
    if (JSON.parse(localStorage.getItem('blockThisSite'))) {
        localStorage.setItem('blockThisSite', false);
        window.location.reload();
    } else {
        localStorage.setItem('blockThisSite', true);
        block();
    }
}
