const languages = [
    { code: "en", name: "English", lang: "English" },
    { code: "jp", name: "Japanese", lang: "日本語" },
    { code: "es", name: "Spanish", lang: "Español" },
    { code: "id", name: "Indonesian", lang: "bahasa Indonesia" },
    { code: "kr", name: "Korean", lang: "한국" },
    { code: "ch", name: "Chinese", lang: "中文" },
];

function conlog(...args) {
    if (params.devMode) {
        return console.log(...args);
    }
}
const isFirefox = /Firefox/.exec(navigator.userAgent) ? true : false;

let languageConversionTable = {};

// WAR: web accessible resource
async function getWAR(u) {
    return new Promise((res, rej) => chrome.runtime.sendMessage({ type: "get_war", url: u }, r => res(r)));
}

async function getFile(name, format) {
    return await (await fetch(await getWAR(name)))[format]();
}

// global helper function to handle scrolling
function updateSize() {
    let pix = document.querySelector(".dropdown-check-list").getBoundingClientRect().bottom;
    document.querySelector(".modal").style.height = pix + "px";
}

let allTranslators = { v: {} };
let allTranslatorCheckbox = {};

async function runLiveTL() {
    await setFavicon();

    switchChat();
    setTimeout(async () => {
        document.title = "LiveTL Chat";

        importFontAwesome();
        await importStyle();

        let livetlContainer = document.createElement("div");
        livetlContainer.className = "livetl";
        document.body.appendChild(livetlContainer);
        if (params.devMode) {
            livetlContainer.style.opacity = "50%";
        }
        let translationDiv = document.createElement("div");
        translationDiv.className = "translationText";

        let settings = createSettings(livetlContainer);
        livetlContainer.appendChild(translationDiv);

        allTranslatorCheckbox = createCheckbox("All Translators", "allTranslatorID", true, () => {
            let boxes = document
                .querySelector("#transelectChecklist")
                .querySelectorAll("input:not(:checked)");
            boxes.forEach(box => box.checked = allTranslatorCheckbox.checked);
            checkboxUpdate();
        });

        prependE = el => translationDiv.prepend(el);

        prependE(await createWelcome());

        setInterval(() => {
            let messages = document.querySelectorAll(".yt-live-chat-text-message-renderer > #message");
            let i = 0;
            while (i < messages.length && messages[i].innerHTML == "") i++;
            for (; i < messages.length; i++) {
                let m = messages[i];
                if (m.innerHTML == "") break;
                let parsed = parseTranslation(m.textContent);
                let select = document.querySelector("#langSelect");
                if (parsed != null && isLangMatch(parsed.lang.toLowerCase(), languageConversionTable[select.value])
                    && parsed.msg.replace(/\s/g, '') != "") {
                    let author = m.parentElement.childNodes[1].textContent;
                    let authorID = /\/ytc\/([^\=]+)\=/.exec(getProfilePic(m))[1];
                    let line = createTranslationElement(author, authorID, parsed.msg);
                    if (!(authorID in allTranslators.v)) {
                        createCheckbox(author, authorID, allTranslatorCheckbox.checked);
                    }
                    if (allTranslators.v[authorID].checked) {
                        prependE(line);
                    }
                }
                m.innerHTML = "";
            }
            createSettingsProjection(prependE);
        }, 1000);
    }, 100);
}

function switchChat() {
    let count = 2;
    document.querySelectorAll(".yt-dropdown-menu").forEach((e) => {
        if (/Live chat/.exec(e.innerText) && count > 0) {
            e.click();
            count--;
        }
    });
};

function parseParams() {
    let s = decodeURI(location.search.substring(1))
        .replace(/"/g, '\\"')
        .replace(/&/g, '","')
        .replace(/=/g, '":"');
    return s == "" ? {} : JSON.parse('{"' + s + '"}');
}

async function insertLiveTLButtons(isHolotools = false) {
    conlog("Inserting LiveTL Launcher Buttons");
    params = parseParams();
    makeButton = (text, callback, color) => {
        let a = document.createElement("span");
        a.appendChild(getLiveTLButton(color));

        let interval2 = setInterval(() => {
            let e = isHolotools ? document.querySelector("#input-panel") : document.querySelector("ytd-live-chat-frame");
            if (e != null) {
                clearInterval(interval2);
                e.appendChild(a);
                a.querySelector("a").onclick = callback;
                a.querySelector("yt-formatted-string").textContent = text;
            }
        }, 100);
    }

    redirectTab = u => chrome.runtime.sendMessage({ type: "redirect", data: u });
    createTab = u => chrome.runtime.sendMessage({ type: "tab", data: u });

    let u = `${await getWAR("index.html")}?v=${params.v}`;
    makeButton("Watch in LiveTL", () => redirectTab({ url: u }));
    makeButton("Pop Out Translations", () => createWindow({
        url: `https://www.youtube.com/live_chat?v=${params.v}&useLiveTL=1`,
        type: "popup",
        focused: true
    }), "rgb(143, 143, 143)");
}

let params = {};
let activationInterval = setInterval(() => {
    if (window.location.href.startsWith("https://www.youtube.com/live_chat")) {
        clearInterval(activationInterval);
        conlog("Using live chat");
        try {
            params = parseParams();
            if (params.useLiveTL) {
                conlog("Running LiveTL!");
                runLiveTL();
            } else if (params.embed_domain == "hololive.jetri.co") {
                insertLiveTLButtons(true);
            }
        } catch (e) { }
    } else if (window.location.href.startsWith("https://www.youtube.com/watch")) {
        clearInterval(activationInterval);
        conlog("Watching video");
        let interval = setInterval(() => {
            if (document.querySelector("ytd-live-chat-frame")) {
                clearInterval(interval);
                insertLiveTLButtons();
            }
        }, 100);
    }
}, 1000);

if (window.location.href.startsWith("https://kentonishi.github.io/LiveTL/about")) {
    window.onload = () => {
        let e = document.querySelector("#actionMessage");
        e.textContent = `Thank you for installing LiveTL!`;
    }
}

function createModal(container) {
    let settingsButton = document.createElement("div");
    settingsGear(settingsButton);
    settingsButton.id = "settingsGear";
    settingsButton.style.zIndex = 1000000;
    settingsButton.style.padding = "5px";
    settingsButton.style.width = "24px";

    let modalContainer = document.createElement("div");
    modalContainer.className = "modal";
    modalContainer.style.zIndex = 1000000;
    modalContainer.style.width = "calc(100% - 20px);";
    modalContainer.style.display = "none";

    let modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    let nextStyle = {
        "flex": "none",
        "none": "flex",
    };

    let icon = {
        "flex": closeSVG,
        "none": settingsGear,
    };


    settingsButton.addEventListener("click", (e) => {
        let newDisplay = nextStyle[modalContainer.style.display];
        modalContainer.style.display = newDisplay;
        icon[newDisplay](settingsButton);
        if (newDisplay == "none") {
            document.querySelector(".translationText").style.display = "block";
            modalContainer.style.height = "auto";
        } else {
            document.querySelector(".translationText").style.display = "none";
            updateSize();
        }
    });

    modalContainer.appendChild(modalContent);

    container.appendChild(settingsButton);
    container.appendChild(modalContainer);

    return modalContent;
}

function importFontAwesome() {
    document.head.innerHTML += `
    <link 
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/npm/fork-awesome@1.1.7/css/fork-awesome.min.css"
     integrity="sha256-gsmEoJAws/Kd3CjuOQzLie5Q3yshhvmo7YNtBG7aaEY="
     crossorigin="anonymous">
        `;
}

function setSelectInputCallbacks(select, defaultValue) {
    select.onfocus = () => select.value = "";
    select.onblur = () => {
        if (!(select.value in languageConversionTable)) {
            select.value = defaultValue;
        }
    };
}

function createLangSelectionName(lang) {
    return `${lang.name} (${lang.lang}) [${lang.code}]`;
}

function createLangSelectOption(lang) {
    let opt = document.createElement("option");
    opt.value = createLangSelectionName(lang);
    return opt;
}

languages.forEach(i => languageConversionTable[createLangSelectionName(i)] = i);

function createLangSelectLabel() {
    let langSelectLabel = document.createElement("span");
    langSelectLabel.className = "optionLabel";
    langSelectLabel.textContent = "Language: ";
    return langSelectLabel;
}

function createSelectInput() {
    let select = document.createElement("input");
    select.dataset.role = "none";
    let defaultLang = languages[0];
    select.value = `${defaultLang.name} (${defaultLang.lang}) [${defaultLang.code}]`;
    select.setAttribute("list", "languages");
    select.id = "langSelect";
    setSelectInputCallbacks(select, select.value);
    return select;
}

function createLangSelectDatalist() {
    let datalist = document.createElement("datalist");
    datalist.id = "languages";
    let appendDatalist = e => datalist.appendChild(e);
    languages.map(createLangSelectOption).map(appendDatalist);
    return datalist;
}

function createLanguageSelect() {
    let langSelectContainer = document.createElement("div");
    langSelectContainer.appendChild(createLangSelectLabel());
    langSelectContainer.appendChild(createSelectInput());
    langSelectContainer.appendChild(createLangSelectDatalist());
    return langSelectContainer;
}

function setChecklistOnclick(checklist) {
    checklist.querySelector('.anchor').onclick = () => {
        let items = checklist.querySelector("#items");
        if (items.style.display != "block") {
            checklist.classList.add("openList");
            items.style.display = "block";
        }
        else {
            checklist.classList.remove("openList");
            items.style.display = "none";
        }
        updateSize();
    }
}

function setChecklistOnblur(checklist) {
    checklist.onblur = e => {
        let items = document.querySelector("#items");
        if (!e.currentTarget.contains(e.relatedTarget)) {
            checklist.classList.remove("openList");
            items.style.display = "none";
        }
        else e.currentTarget.focus();
        updateSize();
    }
}

function setChecklistCallbacks(checklist) {
    setChecklistOnclick(checklist);
    setChecklistOnblur(checklist);
}

function createTransSelectDefaultText() {
    let defaultText = document.createElement("span");
    defaultText.className = "anchor";
    defaultText.textContent = "View All";
    return defaultText;
}

function createTransSelectChecklistItems() {
    let items = document.createElement("ul");
    items.id = "items";
    items.className = "items";
    return items;
}

function createTransSelectLabel() {
    let translatorSelectLabel = document.createElement("span");
    translatorSelectLabel.className = "optionLabel";
    translatorSelectLabel.innerHTML = "Translators:&nbsp";
    return translatorSelectLabel;
}

function createTransSelectChecklist() {
    let checklist = document.createElement("div");
    checklist.className = "dropdown-check-list";
    checklist.id = "transelectChecklist";
    checklist.tabIndex = 1;
    checklist.appendChild(createTransSelectDefaultText());
    checklist.appendChild(createTransSelectChecklistItems());
    setChecklistCallbacks(checklist);
    return checklist;
}

function createTranslatorSelect() {
    let translatorSelectContainer = document.createElement("div");
    translatorSelectContainer.appendChild(createTransSelectLabel());
    translatorSelectContainer.appendChild(createTransSelectChecklist());
    return translatorSelectContainer;
}

function createSettings(container) {
    let settings = createModal(container);
    settings.appendChild(createLanguageSelect());
    settings.appendChild(createTranslatorSelect());
    return settings;
}

function wrapIconWithLink(icon, link) {
    let wrapper = document.createElement("a");
    wrapper.href = link;
    wrapper.target = "about:blank";
    wrapper.appendChild(icon);
    return wrapper;
}

async function createLogo() {
    let a = document.createElement("a");
    a.href = "https://kentonishi.github.io/LiveTL/about/";
    a.target = "about:blank";
    let logo = document.createElement("img");
    logo.className = "logo";
    logo.src = await getWAR("icons/favicon.ico");
    a.appendChild(logo);
    return a;
}

function createIcon(faName, link, addSpace) {
    let icon = document.createElement("i");
    ["fa", "smallIcon", faName].forEach(c => icon.classList.add(c));
    let wrapped = wrapIconWithLink(icon, link);
    return wrapped;
}

async function shareExtension() {
    let details = getFile("manifest.json", "json");
    navigator.share({
        title: details.name,
        text: details.description,
        url: "https://chrome.google.com/webstore/detail/livetl-live-translations/moicohcfhhbmmngneghfjfjpdobmmnlg",
    });
}

function createWelcomeText() {
    let welcomeText = document.createElement("span");
    welcomeText.textContent = `Welcome to LiveTL! Translations will appear above.`;
    let buttons = document.createElement("div");
    buttons.classList.add("authorName");
    buttons.style.marginLeft = "0px";
    buttons.innerHTML = `
        Please consider
        <a id="shareExtension" href="javascript:void(0);">sharing LiveTL with your friends</a>, 
        <a href="https://chrome.google.com/webstore/detail/livetl-live-translations/moicohcfhhbmmngneghfjfjpdobmmnlg" target="about:blank">giving us a 5-star review</a>, 
        <a href="https://discord.gg/uJrV3tmthg" target="about:blank">joining our Discord server</a>, and
        <a href="https://github.com/KentoNishi/LiveTL" target="about:blank">starring our GitHub repository</a>!
    `;
    welcomeText.appendChild(buttons);
    welcomeText.querySelector("#shareExtension").onclick = shareExtension;
    return welcomeText;
}

async function createWelcome() {
    let welcome = document.createElement("div");
    welcome.className = "line";
    welcome.appendChild(await createLogo());
    welcome.appendChild(createIcon("fa-discord", "https://discord.gg/uJrV3tmthg", false));
    welcome.appendChild(createIcon("fa-github", "https://github.com/KentoNishi/LiveTL", true));
    welcome.appendChild(createWelcomeText());
    return welcome;
}

function getChecklist() {
    return document.querySelector("#transelectChecklist");
}

function getChecklistItems() {
    return getChecklist().querySelector("#items");
}

function createCheckmark(authorID, checked, onchange) {
    let checkmark = document.createElement("input");
    checkmark.type = "checkbox";
    checkmark.dataset.id = authorID;
    checkmark.checked = checked;
    checkmark.onchange = onchange;
    return checkmark;
}

function createCheckboxPerson(name, authorID) {
    let person = document.createElement("label");
    person.setAttribute("for", authorID);
    person.textContent = name;
    return person;
}

function createCheckbox(name, authorID, checked = false, callback = null) {
    let items = getChecklistItems();
    let checkbox = createCheckmark(authorID, checked, callback || checkboxUpdate);
    let selectTranslatorMessage = document.createElement("li");
    selectTranslatorMessage.appendChild(checkbox);
    selectTranslatorMessage.appendChild(createCheckboxPerson(name, authorID));
    items.appendChild(selectTranslatorMessage);
    checkboxUpdate();
    return checkbox;
}

function filterBoxes(boxes) {
    boxes.forEach((box) => {
        allTranslators.v[box.dataset.id] = box;
        if (box != allTranslatorCheckbox && !box.checked) {
            allTranslatorCheckbox.checked = false;
        }
    });
}

function checkAll() {
    let boxes = getChecklist().querySelectorAll("input:not(:checked)");
    boxes.forEach(box => box.checked = true);
}

function removeBadTranslations() {
    document.querySelectorAll(".line").forEach((translation, i) => {
        // if (i > 25) {
        //     translation.remove();
        // } else 
        // removed limiting
        if (author = translation.querySelector(".authorName")) {
            if (author.dataset.id && !allTranslators.v[author.dataset.id].checked) {
                translation.remove();
            }
        }
    });
}

function checkboxUpdate() {
    let boxes = getChecklist().querySelectorAll("input");
    allTranslators.v = {};
    filterBoxes(boxes);
    if (allTranslatorCheckbox.checked) {
        checkAll();
    }
    removeBadTranslations();
}

function createAuthorNameElement(author, authorID) {
    let authorName = document.createElement("span");
    authorName.textContent = author;
    authorName.dataset.id = authorID;
    authorName.className = "authorName";
    return authorName;
}

function createAuthorHideButton(translation) {
    let hide = document.createElement("span");
    hide.style.cursor = "pointer";
    hide.onclick = () => translation.remove();
    hideSVG(hide);
    return hide;
}

function createAuthorBanButton(authorID) {
    let ban = document.createElement("span");
    ban.onclick = () => {
        allTranslators.v[authorID].checked = false;
        checkboxUpdate();
    };
    ban.style.cursor = "pointer";
    banSVG(ban);
    return ban;
}

function createAuthorInfoOptions(authorID, line) {
    let options = document.createElement("span");
    options.appendChild(createAuthorHideButton(line));
    options.appendChild(createAuthorBanButton(authorID));
    options.style.display = "none";
    options.className = "messageOptions";
    return options;
}

function createAuthorInfoElement(author, authorID, line) {
    let authorInfo = document.createElement("span");
    authorInfo.appendChild(createAuthorNameElement(author, authorID));
    authorInfo.appendChild(createAuthorInfoOptions(authorID, line));
    return authorInfo;
}

function setTranslationElementCallbacks(line) {
    line.onmouseover = () => line.querySelector(".messageOptions").style.display = "inline-block";
    line.onmouseleave = () => line.querySelector(".messageOptions").style.display = "none";
}

function createTranslationElement(author, authorID, translation) {
    let line = document.createElement("div");
    line.className = "line";
    line.textContent = translation;
    setTranslationElementCallbacks(line);
    line.appendChild(createAuthorInfoElement(author, authorID, line));
    return line;
}


function getProfilePic(el) {
    return el.parentElement.parentElement.querySelector("img").src;
}

function createSettingsProjection(add) {
    let settingsProjection = document.querySelector("#settingsProjection");
    if (settingsProjection) settingsProjection.remove();
    settingsProjection = document.createElement("div");
    settingsProjection.id = "settingsProjection";
    settingsProjection.style.zIndex = -1;
    add(settingsProjection);
}

async function setFavicon() {
    let favicon = getWAR("icons/favicon.ico");
    let faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    faviconLink.type = "image/x-icon";
    faviconLink.href = await favicon;
    document.head.appendChild(faviconLink);
}

async function createWindow(u) {
    if (isFirefox) {
        return window.open(u.url, "",
            "scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=600,height=300"
        );
    }
    else {
        return chrome.runtime.sendMessage({ type: "window", data: u });
    }
}

// MARK

function styleLiveTLButton(a, color) {
    a.style.backgroundColor = `${color || "rgb(0, 153, 255)"}`;
    a.style.font = "inherit";
    a.style.fontSize = "11px";
    a.style.fontWeight = "bold";
    a.style.width = "100%";
    a.style.margin = 0;
    a.style.textAlign = "center";
}

function setLiveTLButtonAttributes(a) {
    [
        "yt-simple-endpoint",
        "style-scope",
        "ytd-toggle-button-renderer"
    ].forEach(c => a.classList.add(c));
    a.tabindex = "-1";
}

function getLiveTLButton(color) {
    let a = document.createElement("a");
    setLiveTLButtonAttributes(a);
    styleLiveTLButton(a, color);
    a.innerHTML = `
        <paper-button id="button" class="style-scope ytd-toggle-button-renderer" role="button" tabindex="0" animated=""
            elevation="0" aria-disabled="false" style="
                padding: 5px;
                width: 100%;
                margin: 0;
            ">
            <yt-formatted-string id="text" class="style-scope ytd-toggle-button-renderer">
            </yt-formatted-string>
            <paper-ripple class="style-scope paper-button">
                <div id="background" class="style-scope paper-ripple" style="opacity: 0.00738;"></div>
                <div id="waves" class="style-scope paper-ripple"></div>
            </paper-ripple>
            <paper-ripple class="style-scope paper-button">
                <div id="background" class="style-scope paper-ripple" style="opacity: 0.007456;"></div>
                <div id="waves" class="style-scope paper-ripple"></div>
            </paper-ripple>
            <paper-ripple class="style-scope paper-button">
                <div id="background" class="style-scope paper-ripple" style="opacity: 0.007748;"></div>
                <div id="waves" class="style-scope paper-ripple"></div>
            </paper-ripple>
        </paper-button>
    `;
    return a;
}

async function importStyle() {
    let style = document.createElement('style');
    style.innerHTML = await getFile("css/frame.css", "text");
    document.head.appendChild(style);
}

function closeSVG(e) {
    e.innerHTML = `<svg class="svgButton" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
}

function hideSVG(e) {
    e.innerHTML = ` <svg class="hide" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 572.098 572.098" style="enable-background:new 0 0 572.098 572.098;" xml:space="preserve"> <g> <path d="M99.187,398.999l44.333-44.332c-24.89-15.037-47.503-33.984-66.763-56.379c29.187-33.941,66.053-60.018,106.947-76.426 c-6.279,14.002-9.853,29.486-9.853,45.827c0,16.597,3.696,32.3,10.165,46.476l35.802-35.797 c-5.698-5.594-9.248-13.36-9.248-21.977c0-17.02,13.801-30.82,30.82-30.82c8.611,0,16.383,3.55,21.971,9.248l32.534-32.534 l36.635-36.628l18.366-18.373c-21.206-4.186-42.896-6.469-64.848-6.469c-107.663,0-209.732,52.155-273.038,139.518L0,298.288 l13.011,17.957C36.83,349.116,66.151,376.999,99.187,398.999z"/> <path d="M459.208,188.998l-44.854,44.854c30.539,16.071,58.115,37.846,80.986,64.437 c-52.167,60.662-128.826,96.273-209.292,96.273c-10.3,0-20.533-0.6-30.661-1.744l-52.375,52.375 c26.903,6.887,54.762,10.57,83.036,10.57c107.663,0,209.738-52.154,273.038-139.523l13.011-17.957l-13.011-17.956 C532.023,242.995,497.844,212.15,459.208,188.998z"/> <path d="M286.049,379.888c61.965,0,112.198-50.234,112.198-112.199c0-5.588-0.545-11.035-1.335-16.402L269.647,378.56 C275.015,379.349,280.461,379.888,286.049,379.888z"/> <path d="M248.815,373.431L391.79,230.455l4.994-4.994l45.796-45.796l86.764-86.77c13.543-13.543,13.543-35.502,0-49.046 c-6.77-6.769-15.649-10.159-24.523-10.159s-17.754,3.384-24.522,10.159l-108.33,108.336l-22.772,22.772l-29.248,29.248 l-48.14,48.14l-34.456,34.456l-44.027,44.027l-33.115,33.115l-45.056,45.055l-70.208,70.203 c-13.543,13.543-13.543,35.502,0,49.045c6.769,6.77,15.649,10.16,24.523,10.16s17.754-3.385,24.523-10.16l88.899-88.898 l50.086-50.086L248.815,373.431z"/> </g> </svg> `;
}

function banSVG(e) {
    e.innerHTML = ` <svg class="ban" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <g data-name="Layer 2"> <g data-name="person-delete"> <rect width="24" height="24" opacity="0" /> <path d="M20.47 7.5l.73-.73a1 1 0 0 0-1.47-1.47L19 6l-.73-.73a1 1 0 0 0-1.47 1.5l.73.73-.73.73a1 1 0 0 0 1.47 1.47L19 9l.73.73a1 1 0 0 0 1.47-1.5z" /> <path d="M10 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" /> <path d="M16 21a1 1 0 0 0 1-1 7 7 0 0 0-14 0 1 1 0 0 0 1 1z" /> </g> </g> </svg> `;
}

function settingsGear(e) {
    e.innerHTML = `<svg class="svgButton" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`;
}

// const closeSVG = `<svg class="svgButton" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
// const hideSVG = ` <svg class="hide" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 572.098 572.098" style="enable-background:new 0 0 572.098 572.098;" xml:space="preserve"> <g> <path d="M99.187,398.999l44.333-44.332c-24.89-15.037-47.503-33.984-66.763-56.379c29.187-33.941,66.053-60.018,106.947-76.426 c-6.279,14.002-9.853,29.486-9.853,45.827c0,16.597,3.696,32.3,10.165,46.476l35.802-35.797 c-5.698-5.594-9.248-13.36-9.248-21.977c0-17.02,13.801-30.82,30.82-30.82c8.611,0,16.383,3.55,21.971,9.248l32.534-32.534 l36.635-36.628l18.366-18.373c-21.206-4.186-42.896-6.469-64.848-6.469c-107.663,0-209.732,52.155-273.038,139.518L0,298.288 l13.011,17.957C36.83,349.116,66.151,376.999,99.187,398.999z"/> <path d="M459.208,188.998l-44.854,44.854c30.539,16.071,58.115,37.846,80.986,64.437 c-52.167,60.662-128.826,96.273-209.292,96.273c-10.3,0-20.533-0.6-30.661-1.744l-52.375,52.375 c26.903,6.887,54.762,10.57,83.036,10.57c107.663,0,209.738-52.154,273.038-139.523l13.011-17.957l-13.011-17.956 C532.023,242.995,497.844,212.15,459.208,188.998z"/> <path d="M286.049,379.888c61.965,0,112.198-50.234,112.198-112.199c0-5.588-0.545-11.035-1.335-16.402L269.647,378.56 C275.015,379.349,280.461,379.888,286.049,379.888z"/> <path d="M248.815,373.431L391.79,230.455l4.994-4.994l45.796-45.796l86.764-86.77c13.543-13.543,13.543-35.502,0-49.046 c-6.77-6.769-15.649-10.159-24.523-10.159s-17.754,3.384-24.522,10.159l-108.33,108.336l-22.772,22.772l-29.248,29.248 l-48.14,48.14l-34.456,34.456l-44.027,44.027l-33.115,33.115l-45.056,45.055l-70.208,70.203 c-13.543,13.543-13.543,35.502,0,49.045c6.769,6.77,15.649,10.16,24.523,10.16s17.754-3.385,24.523-10.16l88.899-88.898 l50.086-50.086L248.815,373.431z"/> </g> </svg> `;
// const banSVG = ` <svg class="ban" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <g data-name="Layer 2"> <g data-name="person-delete"> <rect width="24" height="24" opacity="0" /> <path d="M20.47 7.5l.73-.73a1 1 0 0 0-1.47-1.47L19 6l-.73-.73a1 1 0 0 0-1.47 1.5l.73.73-.73.73a1 1 0 0 0 1.47 1.47L19 9l.73.73a1 1 0 0 0 1.47-1.5z" /> <path d="M10 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" /> <path d="M16 21a1 1 0 0 0 1-1 7 7 0 0 0-14 0 1 1 0 0 0 1 1z" /> </g> </g> </svg> `;
// const settingsGear = `<svg class="svgButton" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`;