block();
chrome.runtime.onMessage.addListener(function () {
    activateBlock();
});

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
