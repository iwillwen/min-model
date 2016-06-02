# min-model

![](https://img.shields.io/npm/v/min-model.svg) ![](https://img.shields.io/david/dev/iwillwen/min-model.svg)

This is a model layer for [MinDB](https://github.com/iwillwen/mindb). It can make MinDB more human-friendly and more fit to the real application development.


## Installation

`min-model` can be install by [NPM](http://npmjs.org).

```shell
$ npm install min-model --save --production
```

Of course, you can include it into your page with `<script>` tag.

```html
<script type="application/javascript" src="/path/to/script/model.js"></script>
```

BTW, `min-model` is also friendly with [browserify](browserify.org), [webpack](webpack.github.io) and [rollup](http://rollupjs.org/).

### Polyfill

`min-model` is using [Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) and [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that are new features in ES2015.
So unfortunately if you want to use `min-model` in the old browsers, you are need to include the polyfills to make them work. Such as [`es6-shim`](https://github.com/paulmillr/es6-shim) and [`es6-symbol`](https://github.com/medikoo/es6-symbol).

```shell
$ npm i es6-shim es6-symbol --save-dev
```

```javascript
import 'es6-shim'
import 'es6-symbol/implement'
```


## Usage

Obviously, `min-model` is depends on MinDB. So you need to install MinDB first.

```javascript
import min from 'min'
import Model from 'min-model'

// And then you must make `min-model` knows
// which MinDB database it should use.
// Bc MinDB has the `min.fork()` method to
// fork a new database.

Model.use(min)
```


Now, you can extend a model which you need to use. For example, here is a Contacts app, so we need to create a `Contact` model to perform every person in the list.

```javascript
// Syntax: Model.extend(name: String, columns: Object)

const Contact = Model.extend('contact', {
  name: String,
  memo: 'There is nothing about him/her.',
  // `min-model` will automatically detect
  // this column is a String column.
  number: Number
})
```

`Model.extend` receives an object that declares columns of the model. Is can include the native type constructor or the default value of a new one.

```javascript
const contact = new Contact({
  name: 'Will Wen Gunn',
  number: 13800138000
})
```


Here are the constructor of the Model and its subclasses.

| Key               | Function                                 | Return                     |
| ----------------- | ---------------------------------------- | -------------------------- |
| `key`             | The unique key of the instance           | `String`                   |
| `get(key)`        | Fetch the value on the `key`             | `Promise(Any)`             |
| `set(key, value)` | Modify the value on the `key`            | `Promise([ String, Any ])` |
| `reset(key)`      | Reset the value on the `key` back the default one | `Promise`                  |
| `reset()`         | Reset the whole instance                 | `Promise`                  |
| `remove()`        | Remove the instance from the database    | `Promise`                  |



The instances also have an event will be emitted.

| Event   | Trigger                                  |
| ------- | ---------------------------------------- |
| `ready` | When the instance data was stored in the database and be ready to process |

**Lifecyle**

The model instance have a lifecyle like following:

- beforeValidate
- beforeStore
- ready
- beforeUpdate
- afterUpdate
- beforeRemove
- afterRemove

These lifecycle hook can simply use in the `Model.extend()`.

```javascript
const Contact = Model.extend('contact', {
  name: String,
  memo: 'There is nothing about him/her.',
  number: Number,

  beforeValidata(content) {
    // convert the number to integer
    content.age = parseInt(content)
  }
})
```


For real application development, the subclasses of Model also have some static methods for management and searching.

| Key                     | Function                                 | Return             |
| ----------------------- | ---------------------------------------- | ------------------ |
| `fetch(key)`            | Fetch the exists instance by its key     | `Promise(Model)`   |
| `setIndex(column)`      | Set a indexer on the column for fast searching | `Indexer`          |
| `search(column, query)` | Searching the instances by the column    | `Promise([Model])` |



### Indexes

For fast searching, `min-model` provide a set of simple but strong algorithms for creating some indexes on the database.

By default, `min-model` support the native types following.

- String (which can be split by comma(`,`), dot(`.`), colon(`:`), semicolon(`;`), exclamation mark(`!`), quotation mark(`"` and `'`) and spaces)
- Number
- Boolean
- Object
- Array
- Date
- Error (base on the messages of the errors)

#### Indexes Usage

For creating indexes, you need to call a static method of the subclasses.

```javascript
// Syntax: Model.setIndex(column) : Indexer

let indexer = Contact.setIndex('name')
indexer = Contact.setIndex('number')
```

Indexer also has a `ready` event will be emitted when it is ready for use, but it is not necessary for listening.

```javascript
// Syntax: Model.search(column, query)

Contact
  .search('name', 'Mike') // maybe there are not just one Mike
  .search('memo', 'Engineer')
   // Yes, you can search a column without creating a indexer
   // `min-model` will use the last search result as the pre-flight data
   // in this search operation.
   .then(result => console.log(result))
```



#### Custom Indexer

If you think the default indexers are not fit for your application, you can build  a custom indexer for it.

`min-model` provides a `BaseIndexer` which is bases on Inverted index algorithm. You can extends a subclass from it and overwrite the `indexMapper` method and `search` (not required) method easily to build your own indexer.

After that, you can use `Model.setIndexer(type, Indexer)` to set up.

| Method                   | Function                                 | Return  | Requred |
| ------------------------ | ---------------------------------------- | ------- | ------- |
| `indexMapper(value)`     | The method to convert the value into the indexes | Array   | √       |
| `search(query, preData)` | The layer method to receive the search result from the `BaseIndexer` and return it to the logical program | Promise |         |



```javascript
import moment from 'moment'
// Here is a 3rd module named moment.js

class FormatedDateIndexer extends Model.BaseIndexer {
  indexMapper(value) {
    // ...
    // value would like '2016-05-01'
    return moment(value).format('YYYY-MM-DD').split('-').map(Number)
  }
}

Model.setIndexer(Date, FormatedDateIndexer)
```



`search` method is a upper layer method for receive the result from the bottom layer and passing it back to the logical program. When indexes from `indexMapper` could not filter the result correctly, you will need to overwrite the `search` method for the last processing.

`search` method must receive two arguments, the first one is the query condition and another is the previous data from the last searching operation. The result from the bottom layer can be received by calling the `this._search`, you should call it and passing the same arguments.

```javascript
export default class NumberIndexer extends Model.BaseIndexer {

  indexMapper(number) {
    return [
      number % 3,
      number % 5,
      number % 7
    ]
  }

  search(query, preData) {
    return this._search(query, preData)
      .then(result => Promise.resolve(
        result.filter(item => item[this.key] === query)
      ))
  }
}
```

Of course, you can set the custom indexer just for a single column too.

```javascript
Contact.setIndexerForColumn('number', NumberIndexer)
```



**Async Indexer**

In sometime, computing the indexes in the local device is not wise so we need to use some API to achieve.

You need to set a property named `async` to be `true` and `indexMapper` method should returns a Promise object.

```javascript
class ChineseStringIndexer extends Model.BaseIndexer {
  get async() { return true }

  indexMapper(val) {
    return new Promise((resolve, reject) => {
      fetch(`http://api.pullword.com/get.php?source=${encodeURIComponent(val)}&param1=0.5&param2=0`)
        .then(res => res.text())
        .then(body => resolve(body.split('\r\n').filter(Boolean)))
        .catch(reject)
    })
  }
}

Contact.setIndexerForColumn('name', ChineseStringIndexer)
```



## Build `min-model`

If you wanna build `min-model` by yourself, you need to clone the project to your machine and install the development dependences.

```shell
$ cd min-model
$ npm install .
```

Make your change and run.

```shell
$ npm run-script build
```



## Test cases

Test cases are coming soon.