require('./index.css');
require('./shapes.css');
require('./scrollbar.css');

function isMatching(full, chunk) {
    if (full.toLowerCase().indexOf(chunk.toLowerCase()) > -1) {
        return true;
    }

    return false;
}

function login() {
    return new Promise((resolve, reject) => {
        VK.init({
            apiId: 5906966
        });
        VK.Auth.login(function(result) {
            if (result.status == 'connected') {
                resolve();
            } else {
                reject();
            }
        });
    });
}

function callAPI(method, params) {
    return new Promise((resolve, reject) => {
        VK.api(method, params, function(result) {
            if (result.error) {
                reject();
            } else {
                resolve(result.response);
            }
        });
    });
}

function createAllFriendsDiv(friends) {
    let templateFn = require('../friend-template.hbs');
    /*Handlebars.registerHelper('searchLeftValue', (a, b) => {
        if (searchLeftValue && searchRightValue) return isMatching(a + ' ' + b, searchVal)
    });*/
    //Handlebars.registerHelper('searchLeftValue', (a, b) => {a + ' ' + b});
    //console.log(isMatching('Вася Пупкин', searchVal));
    return templateFn({
        friends: friends
        //searchLeftValue: searchVal
    });
}

function createInListFriendsDiv(friends) {
    let templateFn = require('../friend-template.hbs');
    //Handlebars.registerHelper('searchRightValue', (a, b) => {return isMatching(a + ' ' + b, searchVal)});
    //console.log(isMatching('Вася Пупкин', searchVal));
    return templateFn({
        friendsInList: friends
        //searchRightValue: searchVal
    });
}

let homeworkContainer = document.querySelector('#homework-container');
let friendsAllList = document.querySelector('#friends-all-box-list');
let friendsInList = document.querySelector('#friends-in-list-box-list');
let appContainer = document.querySelector('#app-container'); // определяем контейнер для dnd-событий
let searchAllInput = document.querySelector('#search-in-all-input');
let searchListInput = document.querySelector('#search-in-list-input');

window.addEventListener('load', () => {
    login()
        .then(() => callAPI('friends.get', { v: 5.62, fields: ['city', 'country', 'photo_100'] }))
        .then(result => {
            let friendsInAllFriendsItems = result.items;
            let friendsInListItems = [];

            if (localStorage.friendsInList && JSON.parse(localStorage.friendsInList)) {
                let savedList = JSON.parse(localStorage.friendsInList);
                console.time('timer1');
                for (let i = 0; i < savedList.length; i++) {
                    for (let j = 0; j < friendsInAllFriendsItems.length; j++) {
                        if (friendsInAllFriendsItems[j].id == savedList[i]) {
                            friendsInListItems.push(friendsInAllFriendsItems[j]);
                            friendsInAllFriendsItems.splice(j, 1);
                        }
                    }
                }
                console.timeEnd('timer1');
                alert('Друзья в списке восстановлены из локального хранилища');
            }

            refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems);
            return [friendsInAllFriendsItems, friendsInListItems];
        })
        .then(result => assignEvents(result)) // назначаем события на элементы
        .catch(() => alert('на чем-то мы упали'));
});

function refreshFriendsLists(leftList, rightList, searchLeftValue, searchRightValue) {
    //console.log(searchLeftValue + ' ' + searchRightValue);
    //if (searchLeftValue && searchRightValue) console.log(isMatching(searchLeftValue, searchRightValue));
    let filteredLeftList = [];
    let filteredRightList = [];

    for (let i = 0; i < leftList.length; i++) {
        if (searchLeftValue && isMatching(leftList[i].first_name + ' ' + leftList[i].last_name, searchLeftValue)) {
            filteredLeftList.push(leftList[i]);
        } else if (!searchLeftValue) {
            filteredLeftList = leftList;
        }
    }

    for (let i = 0; i < rightList.length; i++) {
        if (searchRightValue && isMatching(rightList[i].first_name + ' ' + rightList[i].last_name, searchRightValue)) {
            filteredRightList.push(rightList[i]);
        } else if (!searchRightValue) {
            filteredRightList = rightList;
        }
    }

    friendsAllList.innerHTML = createAllFriendsDiv(filteredLeftList);
    friendsInList.innerHTML = createInListFriendsDiv(filteredRightList);
}

function assignEvents(result) {
    let friendsInAllFriendsItems = result[0]; // определяем массив друзей для правого списка
    let friendsInListItems = result[1]; // определяем массив друзей для левого списка
    let friendsBox = document.querySelector('#friends-box'); // определяем контейнер для запрета выделений
    let dragObject = {};
    let saveButton = document.querySelector('#save-button');

    homeworkContainer.addEventListener('click', e => { // назначаем события на клики по плюсам и крестикам у друзей
        assignAddRemoveFriendEvents(e, friendsInAllFriendsItems, friendsInListItems)
    });

    /* отменяем действия браузера по умолчанию для событий mousedown и selectstart,
       чтобы избежать ненужного выделения при dnd */
    friendsBox.addEventListener('mousedown', e => e.preventDefault());
    friendsBox.addEventListener('selectstart', e => e.preventDefault());

    // назначаем события для DnD-элементов

    appContainer.addEventListener('mousedown', e => {
        dndOnMouseDown(e, dragObject);
    });
    appContainer.addEventListener('mousemove', e => dndOnMouseMove(e, dragObject, friendsInAllFriendsItems, friendsInListItems));
    appContainer.addEventListener('mouseup', e => {
        dndOnMouseUp(e, dragObject, friendsInAllFriendsItems, friendsInListItems);
        dragObject = {};
    });

    // назначаем события для полей поиска

    searchAllInput.addEventListener('keyup', () => {
        refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems, searchAllInput.value, searchListInput.value);
    });
    searchListInput.addEventListener('keyup', () => {
        refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems, searchAllInput.value, searchListInput.value);
    });

    // назначаем событие на кнопку сохранения

    saveButton.addEventListener('click', () => {
        localStorage.friendsInList = JSON.stringify(friendsInListItems.map(i => i.id));
        alert('Друзья в списке успешно сохранены');
    })
}

function assignAddRemoveFriendEvents (e, friendsInAllFriendsItems, friendsInListItems) {
    if (!e.target.dataset.add && !e.target.dataset.remove) {
        return;
    }

    if (e.target.dataset.add) {
        for (let i = 0; i < friendsInAllFriendsItems.length; i++) {
            if (friendsInAllFriendsItems[i].id == e.target.dataset.add) {
                friendsInListItems.push(friendsInAllFriendsItems[i]);
                friendsInAllFriendsItems.splice(i, 1);
                break;
            }
        }
    } else if (e.target.dataset.remove) {
        for (let i = 0; i < friendsInListItems.length; i++) {
            if (friendsInListItems[i].id == e.target.dataset.remove) {
                friendsInAllFriendsItems.push(friendsInListItems[i]);
                friendsInListItems.splice(i, 1);
                break;
            }
        }
    }

    refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems, searchAllInput.value, searchListInput.value);
}

function dndOnMouseDown(e, dragObject) {

    if (e.which != 1) { // если клик правой кнопкой мыши
        return; // то он не запускает перенос
    }

    if (e.target.className == 'cross' || e.target.className == 'plus') {
        return; // если событие произошло на плюсе или крестике - не запускаем перенос
    }

    let elem = e.target.closest('.draggable'); // draggable-элемент

    if (!elem) return; // не нашли, клик вне draggable-объекта

    // запомнить переносимый объект
    elem.classList.add('hovered'); // выделяем переносимый объект
    dragObject.elem = elem.cloneNode(true); // клонируем переносымый элемент
    dragObject.elem.hidden = true; // скрываем клон
    elem.parentNode.insertBefore(dragObject.elem, elem); // вставляем клон в DOM перед оригиналом
    // dragObject.elem = elem;

    // запомнить координаты, с которых начат перенос объекта
    dragObject.downX = e.pageX;
    dragObject.downY = e.pageY;
}

function dndOnMouseMove(e, dragObject, friendsInAllFriendsItems, friendsInListItems) {
    if (!dragObject.elem) return; // элемент не зажат

    if ( !dragObject.avatar ) { // если перенос не начат...

        // посчитать дистанцию, на которую переместился курсор мыши
        let moveX = e.pageX - dragObject.downX;
        let moveY = e.pageY - dragObject.downY;
        if ( Math.abs(moveX) < 3 && Math.abs(moveY) < 3 ) {
            return; // ничего не делать, мышь не передвинулась достаточно далеко
        }

        dragObject.avatar = createAvatar(dragObject); // захватить элемент
        if (!dragObject.avatar) {
            dragObject = {}; // аватар создать не удалось, отмена переноса
            return; // возможно, нельзя захватить за эту часть элемента
        }

        // аватар создан успешно
        dragObject.elem.hidden = false; // показать клон
        // создать вспомогательные свойства shiftX/shiftY
        let coords = getCoords(dragObject.avatar);
        dragObject.shiftX = dragObject.downX - coords.left;
        dragObject.shiftY = dragObject.downY - coords.top;

        startDrag(dragObject); // отобразить начало переноса

        //refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems);
    }

    // отобразить перенос объекта при каждом движении мыши
    dragObject.avatar.style.left = e.pageX - dragObject.shiftX + 'px';
    dragObject.avatar.style.top = e.pageY - dragObject.shiftY + 'px';

    return false;
}

function dndOnMouseUp(e, dragObject, friendsInAllFriendsItems, friendsInListItems) {
    // (1) обработать перенос, если он идет
    if (dragObject.avatar) {
        finishDrag(e, dragObject, friendsInAllFriendsItems, friendsInListItems);
    }

    // в конце mouseup перенос либо завершился, либо даже не начинался
    // (2) в любом случае очистим "состояние переноса" dragObject
    if (dragObject.avatarDiv) dragObject.avatarDiv.remove();
}

function createAvatar(dragObject) {

    // запомнить старые свойства, чтобы вернуться к ним при отмене переноса
    let avatar = dragObject.elem;
    let old = {
        parent: avatar.parentNode,
        nextSibling: avatar.nextSibling,
        position: avatar.position || '',
        left: avatar.left || '',
        top: avatar.top || '',
        zIndex: avatar.zIndex || ''
    };

    // функция для отмены переноса
    avatar.rollback = function() {
        old.parent.insertBefore(avatar, old.nextSibling);
        avatar.style.position = old.position;
        avatar.style.left = old.left;
        avatar.style.top = old.top;
        avatar.style.zIndex = old.zIndex
    };

    return avatar;
}

function getCoords(elem) { // кроме IE8-
    let box = elem.getBoundingClientRect();

    return {
        top: box.top + pageYOffset,
        left: box.left + pageXOffset
    };

}

function startDrag(dragObject) {
    dragObject.avatarDiv = dragObject.avatar;

    appContainer.appendChild(dragObject.avatarDiv);
    dragObject.avatarDiv.style.zIndex = 1000;
    dragObject.avatarDiv.style.position = 'absolute';
    dragObject.avatarDiv.style.opacity = 0.5;

    console.log(dragObject);
}

function finishDrag(e, dragObject, friendsInAllFriendsItems, friendsInListItems) {
    let dropElem = findDroppable(e, dragObject);

    if (dropElem) {
        if (dropElem.id == 'friends-all-box') {
            for (let i = 0; i < friendsInListItems.length; i++) {
                if (friendsInListItems[i].id == dragObject.elem.dataset.id) {
                    friendsInAllFriendsItems.push(friendsInListItems[i]);
                    friendsInListItems.splice(i, 1);
                    break;
                }
            }
        } else if (dropElem.id == 'friends-in-list-box') {
            for (let i = 0; i < friendsInAllFriendsItems.length; i++) {
                if (friendsInAllFriendsItems[i].id == dragObject.elem.dataset.id) {
                    friendsInListItems.push(friendsInAllFriendsItems[i]);
                    friendsInAllFriendsItems.splice(i, 1);
                    break;
                }
            }
        }
    } else {
        console.log('Неудача при переносе');
    }

    refreshFriendsLists(friendsInAllFriendsItems, friendsInListItems, searchAllInput.value, searchListInput.value);
}

function findDroppable(event, dragObject) {
    // спрячем переносимый элемент
    dragObject.avatar.hidden = true;

    // получить самый вложенный элемент под курсором мыши
    let elem = document.elementFromPoint(event.clientX, event.clientY);

    // показать переносимый элемент обратно
    dragObject.avatar.hidden = false;

    if (elem == null) {
        // такое возможно, если курсор мыши "вылетел" за границу окна
        return null;
    }

    return elem.closest('.droppable');
}