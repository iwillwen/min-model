import min from 'min'
import Model from '../'
import { memStore } from './store'

min.store = new memStore()
Model.use(min)

const Person = Model.extend('person', {
  name: String,
  age: 0, // Number,

  beforeValidate(content) {
    content.age = parseInt(content.age)
  }
})

const persons = [
  {
    name: 'Will',
    age: 20
  },
  {
    name: 'Tim',
    age: 19
  },
  {
    name: 'Peter',
    age: 19
  },
  {
    name: 'Mike',
    age: 35
  },
  {
    name: 'Jason',
    age: '63'
  }
]

Promise.all(persons.map(_person => {
  return new Promise(resolve => {
    const person = new Person(_person)

    person.once('ready', resolve)
  })
}))
  .then(() => {
    Person.setIndex('age')

    Person.search('age', 63)
      .then(result => {
        console.log(result)
      })
  })