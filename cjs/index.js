'use strict';

exports.__esModule = true;
exports.init = undefined;

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Server = require('karma').Server;
var io = require('socket.io')(8848);
var path = require('path');

// browsers with driver
var browsers = [];

function getBrowserById(id) {
    return browsers.find(function (browser) {
        return browser.id === id;
    });
}

function sendBack(socket, message) {
    socket.emit('runBack', (0, _assign2.default)({
        fromSever: true
    }, message));
}
var supportedDefs = void 0;
io.on('connection', function (socket) {
    /*io*/
    // tell the request client connect ready
    socket.emit('ready', {
        t: +new Date(),
        supportedDefs: supportedDefs
    });

    socket.on('runCommand', function (msg) {
        var browserId = msg.browserId,
            actions = msg.actions,
            switchFrame = msg.switchFrame,
            browser = void 0;

        if (browserId) {
            browser = getBrowserById(browserId);
        }
        if (!browser || !browser.driver) return sendBack(socket, {
            status: 'can\'t find browser or browser.driver, ensure there is id=[valid karma browser id] in url'
        });
        var driver = browser.driver;
        var prom = _promise2.default.resolve();
        if (actions.length) {
            // switch to top first
            prom = driver.frameParent();
            // switch to frame if any actions defined
            prom = switchFrame && actions.length ? driver.frame('context').then(function () {
                return null;
            }, function () {
                var info = 'can\'t switch to frame#context';
                sendBack(socket, {
                    status: info
                });
            }) : prom;
            // run action chain
            actions.forEach(function (_ref) {
                var action = _ref[0],
                    args = _ref[1];

                prom = prom.then(function () {
                    return driver[action].apply(driver, args).then(function () {
                        return null;
                    }, function (e) {
                        msg.status = e;
                        console.log('error', action, args, e);
                    });
                });
            });
        }
        prom.then(function () {
            return sendBack(socket, msg);
        }, function () {
            return sendBack(socket, msg);
        });
    });

    socket.on('disconnect', function (info) {
        console.log('disconnect:', info);
    });
});

var cfg = require('karma').config;
var karmaConfig = cfg.parseConfig(path.resolve('./karma.conf.js'), {
    port: 9876,
    _singleRun: true // finished auto exit
});

var init = function init() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        onExit = _ref2.onExit;

    var server = new Server(karmaConfig, function (exitCode) {
        console.log('Karma has exited with ' + exitCode);
        onExit && onExit(exitCode);
        process.exit(exitCode);
    });
    server.start();

    // ever tried to share socketServer with Karma
    // let SocketSever = server._injector.get('socketServer');

    server.on('browser_register', function () {
        // seem a private api, axiBug
        // reference, never manipulate
        browsers = server._injector._instances.launcher._browsers;
        var driver = browsers[0].driver;
        // return all support api
        if (!supportedDefs) {
            for (var def in driver) {
                if (typeof driver[def] === 'function') {
                    // 收到驱动器的所有方法名，以便在浏览器构建一个同名的伪驱动器对象
                    supportedDefs = (supportedDefs ? supportedDefs + ' ' : '') + def;
                }
            }
        }
    });
    return server;
};

exports.default = {
    init: init
};
exports.init = init;


if (require.main === module) {
    init();
}
