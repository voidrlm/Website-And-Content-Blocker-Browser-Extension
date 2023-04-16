block();
chrome.runtime.onMessage.addListener(function () {
    activateBlock();
});

document.body.addEventListener('click', block);
document.body.addEventListener('keyup', block);
function block() {
    let currentDomainBlocked = JSON.parse(localStorage.getItem('blockThisSite')) || false;
    var blockByFilter = false;
    if (!currentDomainBlocked) {
        const url = window.location.href;
        const title = document.title;
        //ADD YOUR  FILTERS BELOW
        //Example : www.facebook.com or facebook
        const filters = [];

        if (filters.length !== 0) {
            for (let i = 0; i < filters.length; i++) {
                if (url.includes(filters[i]) || title.includes(filters[i])) {
                    blockByFilter = true;
                    console.log(
                        `%c${'CONTENT BLOCKED BY KEYWORD : ' + filters[i]}`,
                        'background: #FFFF00; color: #000000',
                    );
                    break;
                }
            }
        }
    }

    if (currentDomainBlocked || blockByFilter) {
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
        console.log(`%c${'DOMAIN BLOCKED'}`, 'background: #00FF00; color: #FFFFFF');
    } else {
        localStorage.setItem('blockThisSite', true);
        block();
        console.log(`%c${'DOMAIN BLOCKED'}`, 'background: #FF0000; color: #FFFFFF');
    }
}
