import min from 'min'
import Model from '../'
import { memStore } from './store'
import fetch from 'node-fetch'

min.store = new memStore()

Model.use(min)

const Note = Model.extend('note', {
  content: 'New Note', // String
  favorite: false      // Boolean
})

const contents = [
  `对于大部份应用来说，无论是设计或是开发，首要进行的任务是理解应用的需求，即理解其中所需要数据结构和其操作模式。`,
  `分类是作为网站主要目录的数据，我们可以大致的想象这个目录在网站首页通过并排的形式展示出来。`,
  `而其中的作品也需要进行分类和分级，我们便需要根据这种分级来进行界面设计和功能设计。`,
  `而照片单位的意义在于可能存在只有一张照片的作品，那么如果忽略照片单位，而直接将照片按顺序存储在相册内，如果是只有一张照片的相册则直接以一张照片存储在相册内即可。`
]

class ChineseStringIndexer extends Model.BaseIndexer {
  indexMapper(val) {
    return fetch(`http://pullword.leanapp.cn/get?source=${encodeURIComponent(val)}&threshold=0.5&json=1`)
      .then(res => res.json())
      .catch(() => Promise.resolve([ val ]))
  }
}

Note.setIndexerForColumn('content', ChineseStringIndexer)

Promise.all(
  contents.map(content => {
    return new Promise(resolve => {
      const note = new Note({
        content: content
      })

      note.on('ready', resolve)
    })
  })
)
  .then(() => {
    Note.setIndex('content')

    Note.search('content', '设计')
      .then(notes => console.log(notes))
  })