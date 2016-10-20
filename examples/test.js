'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _min = require('min');

var _min2 = _interopRequireDefault(_min);

var _ = require('../');

var _2 = _interopRequireDefault(_);

var _store = require('./store');

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

_min2.default.store = new _store.memStore();

_2.default.use(_min2.default);

var Note = _2.default.extend('note', {
  content: 'New Note', // String
  favorite: false // Boolean
});

var contents = ['对于大部份应用来说，无论是设计或是开发，首要进行的任务是理解应用的需求，即理解其中所需要数据结构和其操作模式。', '分类是作为网站主要目录的数据，我们可以大致的想象这个目录在网站首页通过并排的形式展示出来。', '而其中的作品也需要进行分类和分级，我们便需要根据这种分级来进行界面设计和功能设计。', '而照片单位的意义在于可能存在只有一张照片的作品，那么如果忽略照片单位，而直接将照片按顺序存储在相册内，如果是只有一张照片的相册则直接以一张照片存储在相册内即可。'];

var ChineseStringIndexer = function (_Model$BaseIndexer) {
  _inherits(ChineseStringIndexer, _Model$BaseIndexer);

  function ChineseStringIndexer() {
    _classCallCheck(this, ChineseStringIndexer);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ChineseStringIndexer).apply(this, arguments));
  }

  _createClass(ChineseStringIndexer, [{
    key: 'indexMapper',
    value: function indexMapper(val) {
      return (0, _nodeFetch2.default)('http://pullword.leanapp.cn/get?source=' + encodeURIComponent(val) + '&threshold=0.5&json=1').then(function (res) {
        return res.json();
      }).catch(function () {
        return Promise.resolve([val]);
      });
    }
  }, {
    key: 'async',
    get: function get() {
      return true;
    }
  }]);

  return ChineseStringIndexer;
}(_2.default.BaseIndexer);

Note.setIndexerForColumn('content', ChineseStringIndexer);

Promise.all(contents.map(function (content) {
  return new Promise(function (resolve) {
    var note = new Note({
      content: content
    });

    note.on('ready', resolve);
  });
})).then(function () {
  Note.setIndex('content');

  Note.search('content', '设计').then(function (notes) {
    return console.log(notes);
  });
});

