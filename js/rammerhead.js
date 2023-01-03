(function () {
    const mod = (n, m) => ((n % m) + m) % m;
    const baseDictionary = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-';
    const shuffledIndicator = '_rhs';
    const generateDictionary = function () {
        let str = '';
        const split = baseDictionary.split('');
        while (split.length > 0) {
            str += split.splice(Math.floor(Math.random() * split.length), 1)[0];
        }
        return str;
    };
    class StrShuffler {
        constructor(dictionary = generateDictionary()) {
            this.dictionary = dictionary;
        }
        shuffle(str) {
            if (str.startsWith(shuffledIndicator)) {
                return str;
            }
            let shuffledStr = '';
            for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                const idx = baseDictionary.indexOf(char);
                if (char === '%' && str.length - i >= 3) {
                    shuffledStr += char;
                    shuffledStr += str.charAt(++i);
                    shuffledStr += str.charAt(++i);
                } else if (idx === -1) {
                    shuffledStr += char;
                } else {
                    shuffledStr += this.dictionary.charAt(mod(idx + i, baseDictionary.length));
                }
            }
            return shuffledIndicator + shuffledStr;
        }
        unshuffle(str) {
            if (!str.startsWith(shuffledIndicator)) {
                return str;
            }

            str = str.slice(shuffledIndicator.length);

            let unshuffledStr = '';
            for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                const idx = this.dictionary.indexOf(char);
                if (char === '%' && str.length - i >= 3) {
                    unshuffledStr += char;
                    unshuffledStr += str.charAt(++i);
                    unshuffledStr += str.charAt(++i);
                } else if (idx === -1) {
                    unshuffledStr += char;
                } else {
                    unshuffledStr += baseDictionary.charAt(mod(idx - i, baseDictionary.length));
                }
            }
            return unshuffledStr;
        }
    }

    function setError(err) {
        var error_container = document.getElementById('error-container');
        var errorText = document.getElementById('error-text');
        if (err) {
            error_container.style.display = 'block';
            errorText.textContent = 'An error occurred: ' + err;
        } else {
            error_container.style.display = 'none';
            errorText.textContent = '';
        }
    }
    function getPassword() {
        var element = document.getElementById('session-password');
        return element ? element.value : '';
    }
    function get(url, callback, shush = false) {
        var pwd = getPassword();
        if (pwd) {
            // really cheap way of adding a query parameter
            if (url.includes('?')) {
                url += '&pwd=' + pwd;
            } else {
                url += '?pwd=' + pwd;
            }
        }

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.send();

        request.onerror = function () {
            if (!shush) setError('Cannot communicate with the server');
        };
        request.onload = function () {
            if (request.status === 200) {
                callback(request.responseText);
            } else {
                if (!shush)
                    setError(
                        'unexpected server response to not match "200". Server says "' + request.responseText + '"'
                    );
            }
        };
    }

    var api = {
        needpassword(callback) {
            get('/needpassword', value => callback(value === 'true'));
        },
        newsession(callback) {
            get('/newsession', callback);
        },
        editsession(id, httpProxy, enableShuffling, callback) {
            get(
                '/editsession?id=' +
                encodeURIComponent(id) +
                (httpProxy ? '&httpProxy=' + encodeURIComponent(httpProxy) : '') +
                '&enableShuffling=' + (enableShuffling ? '1' : '0'),
                function (res) {
                    if (res !== 'Success') return setError('unexpected response from server. received ' + res);
                    callback();
                }
            );
        },
        sessionexists(id, callback) {
            get('/sessionexists?id=' + encodeURIComponent(id), function (res) {
                if (res === 'exists') return callback(true);
                if (res === 'not found') return callback(false);
                setError('unexpected response from server. received' + res);
            });
        },
        deletesession(id, callback) {
            api.sessionexists(id, function (exists) {
                if (exists) {
                    get('/deletesession?id=' + id, function (res) {
                        if (res !== 'Success' && res !== 'not found')
                            return setError('unexpected response from server. received ' + res);
                        callback();
                    });
                } else {
                    callback();
                }
            });
        },
        shuffleDict(id, callback) {
            get('/api/shuffleDict?id=' + encodeURIComponent(id), function (res) {
                callback(JSON.parse(res));
            });
        }
    };

    var localStorageKey = 'rammerhead_sessionids';
    var localStorageKeyDefault = 'rammerhead_default_sessionid';
    var sessionIdsStore = {
        get() {
            var rawData = localStorage.getItem(localStorageKey);
            if (!rawData) return [];
            try {
                var data = JSON.parse(rawData);
                if (!Array.isArray(data)) throw 'getout';
                return data;
            } catch (e) {
                return [];
            }
        },
        set(data) {
            if (!data || !Array.isArray(data)) throw new TypeError('must be array');
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        },
        getDefault() {
            var sessionId = localStorage.getItem(localStorageKeyDefault);
            if (sessionId) {
                var data = sessionIdsStore.get();
                data.filter(function (e) {
                    return e.id === sessionId;
                });
                if (data.length) return data[0];
            }
            return null;
        },
        setDefault(id) {
            localStorage.setItem(localStorageKeyDefault, id);
        }
    };

    function renderSessionTable(data) {
        var tbody = document.querySelector('tbody');
        while (tbody.firstChild && !tbody.firstChild.remove());
        for (var i = 0; i < data.length; i++) {
            var tr = document.createElement('tr');
            appendIntoTr(data[i].id);
            appendIntoTr(data[i].createdOn);

            var fillInBtn = document.createElement('button');
            fillInBtn.textContent = 'Fill in existing session ID';
            fillInBtn.className = 'btn btn-outline-primary';
            fillInBtn.onclick = index(i, function (idx) {
                setError();
                sessionIdsStore.setDefault(data[idx].id);
                loadSettings(data[idx]);
            });
            appendIntoTr(fillInBtn);

            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn btn-outline-danger';
            deleteBtn.onclick = index(i, function (idx) {
                setError();
                api.deletesession(data[idx].id, function () {
                    data.splice(idx, 1)[0];
                    sessionIdsStore.set(data);
                    renderSessionTable(data);
                });
            });
            appendIntoTr(deleteBtn);

            tbody.appendChild(tr);
        }
        function appendIntoTr(stuff) {
            var td = document.createElement('td');
            if (typeof stuff === 'object') {
                td.appendChild(stuff);
            } else {
                td.textContent = stuff;
            }
            tr.appendChild(td);
        }
        function index(i, func) {
            return func.bind(null, i);
        }
    }
    function loadSettings(session) {
        document.getElementById('session-id').value = session.id;
        document.getElementById('session-httpproxy').value = session.httpproxy || '';
        document.getElementById('session-shuffling').checked = typeof session.enableShuffling === 'boolean' ? session.enableShuffling : false;
    }
    function loadSessions() {
        var defaultSession = sessionIdsStore.getDefault();
        if (defaultSession) loadSettings(defaultSession);
    }
    function addSession(id) {
        var data = sessionIdsStore.get();
        data.unshift({ id: id, createdOn: new Date().toLocaleString() });
        sessionIdsStore.set(data);
        renderSessionTable(data);
    }
    function editSession(id, httpproxy, enableShuffling) {
        var data = sessionIdsStore.get();
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === id) {
                data[i].httpproxy = httpproxy;
                data[i].enableShuffling = enableShuffling;
                sessionIdsStore.set(data);
                return;
            }
        }
        throw new TypeError('cannot find ' + id);
    }

    get('/mainport', function (data) {
        var defaultPort = window.location.protocol === 'https:' ? 443 : 80;
        var currentPort = window.location.port || defaultPort;
        var mainPort = data || defaultPort;
        if (currentPort != mainPort) window.location.port = mainPort;
    });

    api.needpassword(doNeed => {
        if (doNeed) {
            document.getElementById('password-wrapper').style.display = '';
        }
    });
    function isUrl(val = '') {
        if (/^http(s?):\/\//.test(val) || val.includes('.') && val.substr(0, 1) !== ' ') return true;
        return false;
    }
    window.addEventListener('load', function () {
        loadSessions();
        /*
        Advanced options are not needed but i will leave this here if i need it later

                var showingAdvancedOptions = false;
                document.getElementById('session-advanced-toggle').onclick = function () {
                    // eslint-disable-next-line no-cond-assign
                    document.getElementById('session-advanced-container').style.display = (showingAdvancedOptions =
                        !showingAdvancedOptions)
                        ? 'block'
                        : 'none';
                };
        */
        document.getElementById('session-create-btn').onclick = function () {
            setError();
            api.newsession(function (id) {
                addSession(id);
                document.getElementById('session-id').value = id;
                document.getElementById('session-httpproxy').value = '';
            });
        };





        function go() {
            setError();
            var id = document.getElementById('session-id').value;
            var httpproxy = document.getElementById('session-httpproxy').value;
            var enableShuffling = document.getElementById('session-shuffling').unchecked;
            let url = document.getElementById('session-url').value;
            if (!isUrl(url)) url = 'https://www.google.com/search?q=' + url;
            else if (!(url.startsWith('https://') || url.startsWith('http://'))) url = 'http://' + url;
            if (!id) return setError('must generate a session id first');
            api.sessionexists(id, function (value) {
                if (!value) return setError('session does not exist. try deleting or generating a new session');
                api.editsession(id, httpproxy, enableShuffling, function () {
                    editSession(id, httpproxy, enableShuffling);
                    api.shuffleDict(id, function (shuffleDict) {
                        if (!shuffleDict) {
                            if (document.getElementById("Ab-Cloak").checked) {
                                console.log("Ab-Cloak is checked");
                                var win; {
                                    if (win) { win.focus(); } else {
                                        win = window.open();
                                        win.document.body.style.margin = '0';
                                        win.document.body.style.height = '100vh';
                                        var iframe = win.document.createElement('iframe');
                                        iframe.style.border = 'none';
                                        iframe.style.width = '100%';
                                        iframe.style.height = '100%';
                                        iframe.style.margin = '0';
                                        if (window.location.href.includes("https://")) {
                                            iframe.src = "https://" + window.location.href.split('/')[2] + "/" + id + "/" + url;
                                        } else {
                                            iframe.src = "http://" + window.location.href.split('/')[2] + "/" + id + "/" + url;
                                        }
                                        win.document.body.appendChild(iframe)
                                    }
                                }
                            } else {

                                window.location.href = '/' + id + '/' + url;
                            }



                        } else {
                            if (document.getElementById("Ab-Cloak").checked) {
                                console.log("Ab-Cloak is checked & session-shuffling is checked");

                                win; {
                                    if (win) { win.focus(); } else {
                                        win = window.open();
                                        win.document.body.style.margin = '0';
                                        win.document.body.style.height = '100vh';
                                        iframe = win.document.createElement('iframe');
                                        iframe.style.border = 'none';
                                        iframe.style.width = '100%';
                                        iframe.style.height = '100%';
                                        iframe.style.margin = '0';
                                        if (window.location.href.includes('https://')) {
                                            iframe.src = "https://" + window.location.href.split('/')[2] + '/' + id + '/' + new StrShuffler(shuffleDict).shuffle(url);
                                        } else {
                                            iframe.src = "http://" + window.location.href.split('/')[2] + '/' + id + '/' + new StrShuffler(shuffleDict).shuffle(url);
                                        }
                                        win.document.body.appendChild(iframe)
                                    }
                                }
                            } else {
                                console.log("Ab claok is not checked with session-shuffling");
                                window.location.href = '/' + id + '/' + new StrShuffler(shuffleDict).shuffle(url);

                            }
                        }
                    });
                });
            });
        }
        document.getElementById('session-go').onclick = go;
        document.getElementById('session-url').onkeydown = function (event) {

            if (event.key === 'Enter') go();
        };
    });
})();
