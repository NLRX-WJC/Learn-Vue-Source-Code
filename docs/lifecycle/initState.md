---
title: 初始化阶段(initState)
---

## 1. 前言

 本篇文章介绍生命周期初始化阶段所调用的第五个初始化函数——`initState`。 从函数名字上来看，这个函数是用来初始化实例状态的，那么什么是实例的状态呢？在前面文章中我们略有提及，在我们日常开发中，在`Vue`组件中会写一些如`props`、`data`、`methods`、`computed`、`watch`选项，我们把这些选项称为实例的状态选项。也就是说，`initState`函数就是用来初始化这些状态的，那么接下来我们就来分析该函数是如何初始化这些状态选项的。

## 2. initState函数分析

首先我们先来分析`initState`函数，该函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
```

可以看到，该函数的代码并不多，而且逻辑也非常清晰。

首先，给实例上新增了一个属性`_watchers`，用来存储当前实例中所有的`watcher`实例，无论是使用`vm.$watch`注册的`watcher`实例还是使用`watch`选项注册的`watcher`实例，都会被保存到该属性中。

这里我们再额外多说一点，在变化侦测篇中我们介绍了`Vue`中对数据变化的侦测是使用属性拦截的方式实现的，但是`Vue`并不是对所有数据都使用属性拦截的方式侦测变化，这是因为数据越多，数据上所绑定的依赖就会多，从而造成依赖追踪的内存开销就会很大，所以从`Vue 2.0`版本起，`Vue`不再对所有数据都进行侦测，而是将侦测粒度提高到了组件层面，对每个组件进行侦测，所以在每个组件上新增了`vm._watchers`属性，用来存放这个组件内用到的所有状态的依赖，当其中一个状态发生变化时，就会通知到组件，然后由组件内部使用虚拟`DOM`进行数据比对，从而降低内存开销，提高性能。

继续回到源码，接下来就是判断实例中有哪些选项就调用对应的选项初始化子函数进行初始化，如下：

```javascript
if (opts.props) initProps(vm, opts.props)
if (opts.methods) initMethods(vm, opts.methods)
if (opts.data) {
    initData(vm)
} else {
    observe(vm._data = {}, true /* asRootData */)
}
if (opts.computed) initComputed(vm, opts.computed)
if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
}
```

先判断实例中是否有`props`选项，如果有，就调用`props`选项初始化函数`initProps`去初始化`props`选项；

再判断实例中是否有`methods`选项，如果有，就调用`methods`选项初始化函数`initMethods`去初始化`methods`选项；

接着再判断实例中是否有`data`选项，如果有，就调用`data`选项初始化函数`initData`去初始化`data`选项；如果没有，就把`data`当作空对象并将其转换成响应式；

接着再判断实例中是否有`computed`选项，如果有，就调用`computed`选项初始化函数`initComputed`去初始化`computed`选项；

最后判断实例中是否有`watch`选项，如果有，就调用`watch`选项初始化函数`initWatch`去初始化`watch`选项；

总之一句话就是：有什么选项就调用对应的选项初始化子函数去初始化什么选项。

以上就是`initState`函数的所有逻辑，其实你会发现，在函数内部初始化这5个选项的时候它的顺序是有意安排的，不是毫无章法的。如果你在开发中有注意到我们在`data`中可以使用`props`，在`watch`中可以观察`data`和`props`，之所以可以这样做，就是因为在初始化的时候遵循了这种顺序，先初始化`props`，接着初始化`data`，最后初始化`watch`。

下面我们就针对这5个状态选项对应的5个初始化子函数进行逐一分析，看看其内部分别都是如何进行初始化的。

## 3. 初始化props

`props`选项通常是由当前组件的父级组件传入的，当父组件在调用子组件的时候，通常会把`props`属性值作为标签属性添加在子组件的标签上，如下：

```html
<Child prop1="xxx" prop2="yyy"></Child>
```

在前面文章介绍初始化事件`initEvents`函数的时候我们说了，在模板编译的时候，当解析到组件标签时会将所有的标签属性都解析出来然后在子组件实例化的时候传给子组件，当然这里面就包括`props`数据。

在子组件内部，通过`props`选项来接收父组件传来的数据，在接收的时候可以这样写：

```javascript
// 写法一
props: ['name']

// 写法二
props: {
    name: String, // [String, Number]
}

// 写法三
props: {
    name:{
		type: String
    }
}

```

可以看到，`Vue`给用户提供的`props`选项写法非常自由，根据`Vue`的惯例，写法虽多但是最终处理的时候肯定只处理一种写法，此时你肯定会想到，处理之前先对数据进行规范化，将所有写法都转化成一种写法。对，你没有猜错，同规范化事件一样，在合并属性的时候也进行了`props`数据的规范化。

### 3.1 规范化数据

`props`数据规范化函数的定义位于源码的`src/core/util/options.js`中，如下：

```javascript
function normalizeProps (options, vm) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}
```

上面代码中，首先拿到实例中的`props`选项，如果不存在，则直接返回。

```javascript
const props = options.props
if (!props) return
```

如果存在，则定义一个空对象`res`，用来存储最终的结果。接着判断如果`props`选项是一个数组（写法一），则遍历该数组中的每一项元素，如果该元素是字符串，那么先将该元素统一转化成驼峰式命名，然后将该元素作为`key`，将`{type: null}`作为`value`存入`res`中；如果该元素不是字符串，则抛出异常。如下：

```javascript
if (Array.isArray(props)) {
    i = props.length
    while (i--) {
        val = props[i]
        if (typeof val === 'string') {
            name = camelize(val)
            res[name] = { type: null }
        } else if (process.env.NODE_ENV !== 'production') {
            warn('props must be strings when using array syntax.')
        }
    }
}
```

如果`props`选项不是数组那就继续判断是不是一个对象，如果是一个对象，那就遍历对象中的每一对键值，拿到每一对键值后，先将键名统一转化成驼峰式命名，然后判断值是否还是一个对象，如果值是对象（写法三），那么就将该键值对存入`res`中；如果值不是对象（写法二），那么就将键名作为`key`，将`{type: null}`作为`value`存入`res`中。如下：

```javascript
if (isPlainObject(props)) {
    for (const key in props) {
        val = props[key]
        name = camelize(key)
        res[name] = isPlainObject(val)
            ? val
        : { type: val }
    }
}
```

如果`props`选项既不是数组也不是对象，那么如果在非生产环境下就抛出异常，最后将`res`作为规范化后的结果重新赋值给实例的`props`选项。如下：

```javascript
if (process.env.NODE_ENV !== 'production') {
    warn(
        `Invalid value for option "props": expected an Array or an Object, ` +
        `but got ${toRawType(props)}.`,
        vm
    )
}
options.props = res
```

以上就是对`props`数据的规范化处理，可以看到，无论是三种写法的哪一种，最终都会被转化成如下写法：

```javascript
props: {
    name:{
        type: xxx
    }
}
```

### 3.2 initProps函数分析

将`props`选项规范化完成之后，接下来我们就可以来真正的初始化`props`选项了，`initProps`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}
```

可以看到，该函数接收两个参数：当前`Vue`实例和当前实例规范化后的`props`选项。

在函数内部首先定义了4个变量，分别是：

```javascript
const propsData = vm.$options.propsData || {}
const props = vm._props = {}
const keys = vm.$options._propKeys = []
const isRoot = !vm.$parent
```

- propsData:父组件传入的真实`props`数据。
- props:指向`vm._props`的指针，所有设置到`props`变量中的属性都会保存到`vm._props`中。
- keys:指向`vm.$options._propKeys`的指针，缓存`props`对象中的`key`，将来更新`props`时只需遍历`vm.$options._propKeys`数组即可得到所有`props`的`key`。
- isRoot:当前组件是否为根组件。

接着，判断当前组件是否为根组件，如果不是，那么不需要将`props`数组转换为响应式的，`toggleObserving(false)`用来控制是否将数据转换成响应式。如下：

```javascript
if (!isRoot) {
    toggleObserving(false)
}
```

接着，遍历`props`选项拿到每一对键值，先将键名添加到`keys`中，然后调用`validateProp`函数（关于该函数下面会介绍）校验父组件传入的`props`数据类型是否匹配并获取到传入的值`value`，然后将键和值通过`defineReactive`函数添加到`props`（即`vm._props`）中，如下：

```javascript
for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
  }
```

添加完之后再判断这个`key`在当前实例`vm`中是否存在，如果不存在，则调用`proxy`函数在`vm`上设置一个以`key`为属性的代码，当使用`vm[key]`访问数据时，其实访问的是`vm._props[key]`。如下：

```javascript
if (!(key in vm)) {
    proxy(vm, `_props`, key)
}
```

以上就是`initProps`函数的所有逻辑，接下来我们再看一下是如何通过`validateProp`函数校验父组件传入的`props`数据类型是否匹配并获取到传入的值的。

### 3.3 validateProp函数分析

`validateProp`函数的定义位于源码的`src/core/util/props.js`中，如下：

```javascript
export function validateProp (key,propOptions,propsData,vm) {
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]
  // boolean casting
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }
  // check default value
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
  if (process.env.NODE_ENV !== 'production') {
    assertProp(prop, key, value, vm, absent)
  }
  return value
}
```

可以看到，该函数接收4个参数，分别是：

- key:遍历`propOptions`时拿到的每个属性名。
- propOptions:当前实例规范化后的`props`选项。
- propsData:父组件传入的真实`props`数据。
- vm:当前实例。

在函数内部首先定义了3个变量，分别是：

```javascript
const prop = propOptions[key]
const absent = !hasOwn(propsData, key)
let value = propsData[key]
```

- prop:当前`key`在`propOptions`中对应的值。
- absent:当前`key`是否在`propsData`中存在，即父组件是否传入了该属性。
- value:当前`key`在`propsData`中对应的值，即父组件对于该属性传入的真实值。

接着，判断`prop`的`type`属性是否是布尔类型（Boolean）,`getTypeIndex`函数用于判断`prop`的`type`属性中是否存在某种类型，如果存在，则返回该类型在`type`属性中的索引（因为`type`属性可以是数组），如果不存在则返回-1。

如果是布尔类型的话，那么有两种边界情况需要单独处理：

1. 如果`absent`为`true`，即父组件没有传入该`prop`属性并且该属性也没有默认值的时候，将该属性值设置为`false`，如下：

   ```javascript
   if (absent && !hasOwn(prop, 'default')) {
       value = false
   }
   ```

2. 如果父组件传入了该`prop`属性，那么需要满足以下几点：

   - 该属性值为空字符串或者属性值与属性名相等；
   - `prop`的`type`属性中不存在`String`类型；
   - 如果`prop`的`type`属性中存在`String`类型，那么`Boolean`类型在`type`属性中的索引必须小于`String`类型的索引，即`Boolean`类型的优先级更高;

   则将该属性值设置为`true`，如下：

   ```javascript
   if (value === '' || value === hyphenate(key)) {
       const stringIndex = getTypeIndex(String, prop.type)
       if (stringIndex < 0 || booleanIndex < stringIndex) {
           value = true
       }
   }
   ```

   另外，在判断属性值与属性名相等的时候，是先将属性名由驼峰式转换成用`-`连接的字符串，下面的这几种写法，子组件的`prop`都将被设置为`true`：

   ```html
   <Child name></Child>
   <Child name="name"></Child>
   <Child userName="user-name"></Child>
   ```

   如果不是布尔类型，是其它类型的话，那就只需判断父组件是否传入该属性即可，如果没有传入，则该属性值为`undefined`，此时调用`getPropDefaultValue`函数（关于该函数下面会介绍）获取该属性的默认值，并将其转换成响应式，如下：

   ```javascript
   if (value === undefined) {
       value = getPropDefaultValue(vm, prop, key)
       // since the default value is a fresh copy,
       // make sure to observe it.
       const prevShouldObserve = shouldObserve
       toggleObserving(true)
       observe(value)
       toggleObserving(prevShouldObserve)
   }
   ```

   如果父组件传入了该属性并且也有对应的真实值，那么在非生产环境下会调用`assertProp`函数（关于该函数下面会介绍）校验该属性值是否与要求的类型相匹配。如下：

   ```javascript
   if (process.env.NODE_ENV !== 'production' ) {
       assertProp(prop, key, value, vm, absent)
   }
   ```

   最后将父组件传入的该属性的真实值返回。

### 3.4 getPropDefaultValue函数分析

`getPropDefaultValue`函数的定义位于源码的`src/core/util/props.js`中，如下：

```javascript
function getPropDefaultValue (vm, prop, key){
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}
```

该函数接收三个参数，分别是：

- vm:当前实例；
- prop:子组件`props`选项中的每个`key`对应的值；
- key:子组件`props`选项中的每个`key`；

其作用是根据子组件`props`选项中的`key`获取其对应的默认值。

首先判断`prop`中是否有`default`属性，如果没有，则表示没有默认值，直接返回。如下：

```javascript
if (!hasOwn(prop, 'default')) {
    return undefined
}
```

如果有则取出`default`属性，赋给变量`def`。接着判断在非生产环境下`def`是否是一个对象，如果是，则抛出警告：对象或数组默认值必须从一个工厂函数获取。如下：

```javascript
const def = prop.default
// warn against non-factory defaults for Object & Array
if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
        'Invalid default value for prop "' + key + '": ' +
        'Props with type Object/Array must use a factory function ' +
        'to return the default value.',
        vm
    )
}
```

接着，再判断如果父组件没有传入该`props`属性，但是在`vm._props`中有该属性值，这说明`vm._props`中的该属性值就是默认值，如下：

```javascript
if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
   ) {
    return vm._props[key]
}
```

最后，判断`def`是否为函数并且`prop.type`不为`Function`，如果是的话表明`def`是一个返回对象或数组的工厂函数，那么将函数的返回值作为默认值返回；如果`def`不是函数，那么则将`def`作为默认值返回。如下：

```javascript
return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
	: def
```

### 3.5 assertProp函数分析

`assertProp`函数的定义位于源码的`src/core/util/props.js`中，如下：

```javascript
function assertProp (prop,name,value,vm,absent) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }
  if (!valid) {
    warn(
      `Invalid prop: type check failed for prop "${name}".` +
      ` Expected ${expectedTypes.map(capitalize).join(', ')}` +
      `, got ${toRawType(value)}.`,
      vm
    )
    return
  }
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

```

该函数接收5个参数，分别是：

- prop:`prop`选项;
- name:`props`中`prop`选项的`key`;
- value:父组件传入的`propsData`中`key`对应的真实数据；
- vm:当前实例；
- absent:当前`key`是否在`propsData`中存在，即父组件是否传入了该属性。

其作用是校验父组件传来的真实值是否与`prop`的`type`类型相匹配，如果不匹配则在非生产环境下抛出警告。

函数内部首先判断`prop`中如果设置了必填项（即`prop.required`为`true`）并且父组件又没有传入该属性，此时则抛出警告：提示该项必填。如下：

```javascript
if (prop.required && absent) {
    warn(
        'Missing required prop: "' + name + '"',
        vm
    )
    return
}
```

接着判断如果该项不是必填的并且该项的值`value`不存在，那么此时是合法的，直接返回。如下：

```javascript
if (value == null && !prop.required) {
    return
}
```

接下来定义了3个变量，分别是：

```javascript
let type = prop.type
let valid = !type || type === true
const expectedTypes = []
```



- type:`prop`中的`type`类型；
- valid：校验是否成功；
- expectedTypes：保存期望类型的数组，当校验失败抛出警告时，会提示用户该属性所期望的类型是什么；

通常情况下，`type`可以是一个原生构造函数，也可以是一个包含多种类型的数组，还可以不设置该属性。如果用户设置的是原生构造函数或数组，那么此时`vaild`默认为`false`（`!type`），如果用户没有设置该属性，表示不需要校验，那么此时`vaild`默认为`true`，即校验成功。

另外，当`type`等于`true`时，即出现这样的写法：`props:{name:true}`，这说明`prop`一定会校验成功。所以当出现这种语法的时候，此时`type === true`，所以`vaild`默认为`true`。

接下来开始校验类型，如果用户设置了`type`属性，则判断该属性是不是数组，如果不是，则统一转化为数组，方便后续处理，如下：

```javascript
if (type) {
    if (!Array.isArray(type)) {
        type = [type]
    }
}
```

接下来遍历`type`数组，并调用`assertType`函数校验`value`。`assertType`函数校验后会返回一个对象，如下：

```javascript
{
    vaild:true,       // 表示是否校验成功
    expectedType：'Boolean'   // 表示被校验的类型
}
```

然后将被校验的类型添加到`expectedTypes`中，并将`vaild`变量设置为`assertedType.valid`，如下：

```javascript
for (let i = 0; i < type.length && !valid; i++) {
    const assertedType = assertType(value, type[i])
    expectedTypes.push(assertedType.expectedType || '')
    valid = assertedType.valid
}
```

这里请注意：上面循环中的条件语句有这样一个条件：`!vaild`，即`type`数组中还要有一个校验成功，循环立即结束，表示校验通过。

接下来，如果循环完毕后`vaild`为`false`，即表示校验未通过，则抛出警告。如下：

```javascript
if (!valid) {
    warn(
        `Invalid prop: type check failed for prop "${name}".` +
        ` Expected ${expectedTypes.map(capitalize).join(', ')}` +
        `, got ${toRawType(value)}.`,
        vm
    )
    return
}
```

另外，`prop`选项还支持自定义校验函数，如下：

```javascript
props:{
   // 自定义验证函数
    propF: {
      validator: function (value) {
        // 这个值必须匹配下列字符串中的一个
        return ['success', 'warning', 'danger'].indexOf(value) !== -1
      }
    }
}
```

所以还需要使用用户传入的自定义校验函数来校验数据。首先获取到用户传入的校验函数，调用该函数并将待校验的数据传入，如果校验失败，则抛出警告。如下：

```javascript
const validator = prop.validator
if (validator) {
    if (!validator(value)) {
        warn(
            'Invalid prop: custom validator check failed for prop "' + name + '".',
            vm
        )
    }
}
```



## 4. 初始化methods

初始化`methods`相较而言就比较简单了，它的初始化函数定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function initMethods (vm, methods) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `Method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
  }
}
```

从代码中可以看到，初始化`methods`无非就干了三件事：判断`method`有没有？`method`的命名符不符合命名规范？如果`method`既有又符合规范那就把它挂载到`vm`实例上。下面我们就逐行分析源码，来过一遍这三件事。

首先，遍历`methods`选项中的每一个对象，在非生产环境下判断如果`methods`中某个方法只有`key`而没有`value`，即只有方法名没有方法体时，抛出异常：提示用户方法未定义。如下：

```javascript
if (methods[key] == null) {
    warn(
        `Method "${key}" has an undefined value in the component definition. ` +
        `Did you reference the function correctly?`,
        vm
    )
}
```

接着判断如果`methods`中某个方法名与`props`中某个属性名重复了，就抛出异常：提示用户方法名重复了。如下：

```javascript
if (props && hasOwn(props, key)) {
    warn(
        `Method "${key}" has already been defined as a prop.`,
        vm
    )
}
```

接着判断如果`methods`中某个方法名如果在实例`vm`中已经存在并且方法名是以`_`或`$`开头的，就抛出异常：提示用户方法名命名不规范。如下：

```javascript
if ((key in vm) && isReserved(key)) {
    warn(
        `Method "${key}" conflicts with an existing Vue instance method. ` +
        `Avoid defining component methods that start with _ or $.`
    )
}
```

其中，`isReserved`函数是用来判断字符串是否以`_`或`$`开头。

最后，如果上述判断都没问题，那就`method`绑定到实例`vm`上，这样，我们就可以通过`this.xxx`来访问`methods`选项中的`xxx`方法了，如下：

```javascript
vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
```

## 5. 初始化data

初始化`data`也比较简单，它的初始化函数定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function initData (vm) {
    let data = vm.$options.data
    data = vm._data = typeof data === 'function'
        ? getData(data, vm)
    : data || {}
    if (!isPlainObject(data)) {
        data = {}
        process.env.NODE_ENV !== 'production' && warn(
            'data functions should return an object:\n' +
            'https://vuejs.org/v2/guide/components.html##data-Must-Be-a-Function',
            vm
        )
    }
    // proxy data on instance
    const keys = Object.keys(data)
    const props = vm.$options.props
    const methods = vm.$options.methods
    let i = keys.length
    while (i--) {
        const key = keys[i]
        if (process.env.NODE_ENV !== 'production') {
            if (methods && hasOwn(methods, key)) {
                warn(
                    `Method "${key}" has already been defined as a data property.`,
                    vm
                )
            }
        }
        if (props && hasOwn(props, key)) {
            process.env.NODE_ENV !== 'production' && warn(
                `The data property "${key}" is already declared as a prop. ` +
                `Use prop default value instead.`,
                vm
            )
        } else if (!isReserved(key)) {
            proxy(vm, `_data`, key)
        }
    }
    // observe data
    observe(data, true /* asRootData */)
}
```

可以看到，`initData`函数的逻辑并不复杂，跟`initMethods`函数的逻辑有几分相似。就是通过一系列条件判断用户传入的`data`选项是否合法，最后将`data`转换成响应式并绑定到实例`vm`上。下面我们就来仔细看一下代码逻辑。

首先获取到用户传入的`data`选项，赋给变量`data`，同时将变量`data`作为指针指向`vm._data`，然后判断`data`是不是一个函数，如果是就调用`getData`函数获取其返回值，将其保存到`vm._data`中。如果不是，就将其本身保存到`vm._data`中。如下：

```javascript
let data = vm.$options.data
data = vm._data = typeof data === 'function'
    ? getData(data, vm)
	: data || {}
```

我们知道，无论传入的`data`选项是不是一个函数，它最终的值都应该是一个对象，如果不是对象的话，就抛出警告：提示用户`data`应该是一个对象。如下：

```javascript
if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
        'data functions should return an object:\n' +
        'https://vuejs.org/v2/guide/components.html##data-Must-Be-a-Function',
        vm
    )
}
```

接下来遍历`data`对象中的每一项，在非生产环境下判断`data`对象中是否存在某一项的`key`与`methods`中某个属性名重复，如果存在重复，就抛出警告：提示用户属性名重复。如下：

```javascript
if (process.env.NODE_ENV !== 'production') {
    if (methods && hasOwn(methods, key)) {
        warn(
            `Method "${key}" has already been defined as a data property.`,
            vm
        )
    }
}
```

接着再判断是否存在某一项的`key`与`prop`中某个属性名重复，如果存在重复，就抛出警告：提示用户属性名重复。如下：

```javascript
if (props && hasOwn(props, key)) {
    process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
    )
}
```

如果都没有重复，则调用`proxy`函数将`data`对象中`key`不以`_`或`$`开头的属性代理到实例`vm`上，这样，我们就可以通过`this.xxx`来访问`data`选项中的`xxx`数据了。如下：

```javascript
if (!isReserved(key)) {
    proxy(vm, `_data`, key)
}
```

最后，调用`observe`函数将`data`中的数据转化成响应式，如下：

```javascript
observe(data, true /* asRootData */)
```



## 6. 初始化computed

计算属性`computed`相信大家一定不会陌生，在日常开发中肯定会经常用到，而且我们知道计算属性有一个很大的特点就是： 计算属性的结果会被缓存，除非依赖的响应式属性变化才会重新计算。 那么接下来我们就来看一下计算属性是如何实现这些功能的的。

### 6.1 回顾用法

首先，根据官方文档的使用示例，我们来回顾一下计算属性的用法，如下：

```javascript
var vm = new Vue({
  data: { a: 1 },
  computed: {
    // 仅读取
    aDouble: function () {
      return this.a * 2
    },
    // 读取和设置
    aPlus: {
      get: function () {
        return this.a + 1
      },
      set: function (v) {
        this.a = v - 1
      }
    }
  }
})
vm.aPlus   // => 2
vm.aPlus = 3
vm.a       // => 2
vm.aDouble // => 4
```

可以看到，`computed`选项中的属性值可以是一个函数，那么该函数默认为取值器`getter`，用于仅读取数据；还可以是一个对象，对象里面有取值器`getter`和存值器`setter`，用于读取和设置数据。

### 6.2 initComputed函数分析

了解了计算属性的用法之后，下面我们就来分析一下计算属性的初始化函数`initComputed`的内部原理是怎样的。`initComputed`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function initComputed (vm: Component, computed: Object) {
    const watchers = vm._computedWatchers = Object.create(null)
    const isSSR = isServerRendering()

    for (const key in computed) {
        const userDef = computed[key]
        const getter = typeof userDef === 'function' ? userDef : userDef.get
        if (process.env.NODE_ENV !== 'production' && getter == null) {
            warn(
                `Getter is missing for computed property "${key}".`,
                vm
            )
        }

        if (!isSSR) {
            // create internal watcher for the computed property.
            watchers[key] = new Watcher(
                vm,
                getter || noop,
                noop,
                computedWatcherOptions
            )
        }

        if (!(key in vm)) {
            defineComputed(vm, key, userDef)
        } else if (process.env.NODE_ENV !== 'production') {
            if (key in vm.$data) {
                warn(`The computed property "${key}" is already defined in data.`, vm)
            } else if (vm.$options.props && key in vm.$options.props) {
                warn(`The computed property "${key}" is already defined as a prop.`, vm)
            }
        }
    }
}
```

可以看到，在函数内部，首先定义了一个变量`watchers`并将其赋值为空对象，同时将其作为指针指向`vm._computedWatchers`，如下：

```javascript
const watchers = vm._computedWatchers = Object.create(null)
```

接着，遍历`computed`选项中的每一项属性，首先获取到每一项的属性值，记作`userDef`，然后判断`userDef`是不是一个函数，如果是函数，则该函数默认为取值器`getter`，将其赋值给变量`getter`；如果不是函数，则说明是一个对象，则取对象中的`get`属性作为取值器赋给变量`getter`。如下：

```javascript
const userDef = computed[key]
const getter = typeof userDef === 'function' ? userDef : userDef.get
```

接着判断在非生产环境下如果上面两种情况取到的取值器不存在，则抛出警告：提示用户计算属性必须有取值器。如下：

```javascript
if (process.env.NODE_ENV !== 'production' && getter == null) {
    warn(
        `Getter is missing for computed property "${key}".`,
        vm
    )
}
```

接着判断如果不是在服务端渲染环境下，则创建一个`watcher`实例，并将当前循环到的的属性名作为键，创建的`watcher`实例作为值存入`watchers`对象中。如下：

```javascript
if (!isSSR) {
    // create internal watcher for the computed property.
    watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
    )
}
```

最后，判断当前循环到的的属性名是否存在于当前实例`vm`上，如果存在，则在非生产环境下抛出警告；如果不存在，则调用`defineComputed`函数为实例`vm`上设置计算属性。

以上就是`initComputed`函数的内部逻辑，接下里我们再来看一下`defineComputed`函数是如何为实例`vm`上设置计算属性的。

### 6.3 defineComputed函数分析



`defineComputed`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function defineComputed (target,key,userDef) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : userDef
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}


```

该函数接受3个参数，分别是：`target`、`key`和`userDef`。其作用是为`target`上定义一个属性`key`，并且属性`key`的`getter`和`setter`根据`userDef`的值来设置。下面我们就来看一下该函数的具体逻辑。

首先定义了变量`sharedPropertyDefinition`，它是一个默认的属性描述符。

接着，在函数内部定义了变量`shouldCache`，用于标识计算属性是否应该有缓存。该变量的值是当前环境是否为非服务端渲染环境，如果是非服务端渲染环境则该变量为`true`。也就是说，只有在非服务端渲染环境下计算属性才应该有缓存。如下：

```javascript
const shouldCache = !isServerRendering()
```

接着，判断如果`userDef`是一个函数，则该函数默认为取值器`getter`，此处在非服务端渲染环境下并没有直接使用`userDef`作为`getter`，而是调用`createComputedGetter`函数（关于该函数下面会介绍）创建了一个`getter`，这是因为`userDef`只是一个普通的`getter`，它并没有缓存功能，所以我们需要额外创建一个具有缓存功能的`getter`，而在服务端渲染环境下可以直接使用`userDef`作为`getter`，因为在服务端渲染环境下计算属性不需要缓存。由于用户没有设置`setter`函数，所以将`sharedPropertyDefinition.set`设置为`noop`。如下：

```javascript
if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
        ? createComputedGetter(key)
    : userDef
    sharedPropertyDefinition.set = noop
}
```

如果`userDef`不是一个函数，那么就将它当作对象处理。在设置`sharedPropertyDefinition.get`的时候先判断`userDef.get`是否存在，如果不存在，则将其设置为`noop`，如果存在，则同上面一样，在非服务端渲染环境下并且用户没有明确的将`userDef.cache`设置为`false`时调用`createComputedGetter`函数创建一个`getter`赋给`sharedPropertyDefinition.get`。然后设置`sharedPropertyDefinition.set`为`userDef.set`函数。如下：

```javascript
sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
sharedPropertyDefinition.set = userDef.set
    ? userDef.set
	: noop
```

接着，再判断在非生产环境下如果用户没有设置`setter`的话，那么就给`setter`一个默认函数，这是为了防止用户在没有设置`setter`的情况下修改计算属性，从而为其抛出警告，如下：

```javascript
if (process.env.NODE_ENV !== 'production' &&
    sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
        warn(
            `Computed property "${key}" was assigned to but it has no setter.`,
            this
        )
    }
}
```

最后调用`Object.defineProperty`方法将属性`key`绑定到`target`上，其中的属性描述符就是上面设置的`sharedPropertyDefinition`。如此以来，就将计算属性绑定到实例`vm`上了。

以上就是`defineComputed`函数的所有逻辑。另外，我们发现，计算属性有没有缓存及其响应式貌似主要在于是否将`getter`设置为`createComputedGetter`函数的返回结果。那么接下来，我们就对这个`createComputedGetter`函数一探究竟。

### 6.4 createComputedGetter函数分析

`createComputedGetter`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function createComputedGetter (key) {
    return function computedGetter () {
        const watcher = this._computedWatchers && this._computedWatchers[key]
        if (watcher) {
            watcher.depend()
            return watcher.evaluate()
        }
    }
}
```

可以看到，该函数是一个高阶函数，其内部返回了一个`computedGetter`函数，所以其实是将`computedGetter`函数赋给了`sharedPropertyDefinition.get`。当获取计算属性的值时会执行属性的`getter`，而属性的`getter`就是 `sharedPropertyDefinition.get`，也就是说最终执行的 `computedGetter`函数。

在`computedGetter`函数内部，首先存储在当前实例上`_computedWatchers`属性中`key`所对应的`watcher`实例，如果`watcher`存在，则调用`watcher`实例上的`depend`方法和`evaluate`方法，并且将`evaluate`方法的返回值作为计算属性的计算结果返回。那么`watcher`实例上的`depend`方法和`evaluate`方法又是什么呢？

### 6.5 depend和evaluate

回顾上文中创建`watcher`实例的时候：

```javascript
const computedWatcherOptions = { computed: true }
watchers[key] = new Watcher(
    vm,
    getter || noop,
    noop,
    computedWatcherOptions
)
```

传入的参数中第二个参数是`getter`函数，第四个参数是一个对象`computedWatcherOptions`。

我们再回顾`Watcher`类的定义，如下：

```javascript
export default class Watcher {
    constructor (vm,expOrFn,cb,options,isRenderWatcher) {
        if (options) {
            // ...
            this.computed = !!options.computed
            // ...
        } else {
            // ...
        }

        this.dirty = this.computed // for computed watchers
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn
        }

        if (this.computed) {
            this.value = undefined
            this.dep = new Dep()
        }
    }

    evaluate () {
        if (this.dirty) {
            this.value = this.get()
            this.dirty = false
        }
        return this.value
    }

    /**
     * Depend on this watcher. Only for computed property watchers.
     */
    depend () {
        if (this.dep && Dep.target) {
            this.dep.depend()
        }
    }

    update () {
        if (this.computed) {
            if (this.dep.subs.length === 0) {
                this.dirty = true
            } else {
                this.getAndInvoke(() => {
                    this.dep.notify()
                })
            }
        }
    }

    getAndInvoke (cb: Function) {
        const value = this.get()
        if (
            value !== this.value ||
            // Deep watchers and watchers on Object/Arrays should fire even
            // when the value is the same, because the value may
            // have mutated.
            isObject(value) ||
            this.deep
        ) {
            // set new value
            const oldValue = this.value
            this.value = value
            this.dirty = false
            if (this.user) {
                try {
                    cb.call(this.vm, value, oldValue)
                } catch (e) {
                    handleError(e, this.vm, `callback for watcher "${this.expression}"`)
                }
            } else {
                cb.call(this.vm, value, oldValue)
            }
        }
    }
}
```

可以看到，在实例化`Watcher`类的时候，第四个参数传入了一个对象`computedWatcherOptions = { computed: true }`，该对象中的`computed`属性标志着这个`watcher`实例是计算属性的`watcher`实例，即`Watcher`类中的`this.computed`属性，同时类中还定义了`this.dirty`属性用于标志计算属性的返回值是否有变化，计算属性的缓存就是通过这个属性来判断的，每当计算属性依赖的数据发生变化时，会将`this.dirty`属性设置为`true`，这样下一次读取计算属性时，会重新计算结果返回，否则直接返回之前的计算结果。

当调用`watcher.depend()`方法时，会将读取计算属性的那个`watcher`添加到计算属性的`watcher`实例的依赖列表中，当计算属性中用到的数据发生变化时，计算属性的`watcher`实例就会执行`watcher.update()`方法，在`update`方法中会判断当前的`watcher`是不是计算属性的`watcher`，如果是则调用`getAndInvoke`去对比计算属性的返回值是否发生了变化，如果真的发生变化，则执行回调，通知那些读取计算属性的`watcher`重新执行渲染逻辑。

当调用`watcher.evaluate()`方法时，会先判断`this.dirty`是否为`true`，如果为`true`，则表明计算属性所依赖的数据发生了变化，则调用`this.get()`重新获取计算结果最后返回；如果为`false`，则直接返回之前的计算结果。

其内部原理如图所示：

![](~@/lifecycle/2.png)


## 7. 初始化watch

接下来就是最后一个初始化函数了——初始化`watch`选项。在日常开发中`watch`选项也经常会使用到，它可以用来侦听某个已有的数据，当该数据发生变化时执行对应的回调函数。那么，接下来我们就来看一些`watch`选项是如何被初始化的。

### 7.1 回顾用法

首先，根据官方文档的使用示例，我们来回顾一下`watch`选项的用法，如下：

```javascript
var vm = new Vue({
  data: {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: {
      f: {
        g: 5
      }
    }
  },
  watch: {
    a: function (val, oldVal) {
      console.log('new: %s, old: %s', val, oldVal)
    },
    // methods选项中的方法名
    b: 'someMethod',
    // 深度侦听，该回调会在任何被侦听的对象的 property 改变时被调用，不论其被嵌套多深
    c: {
      handler: function (val, oldVal) { /* ... */ },
      deep: true
    },
    // 该回调将会在侦听开始之后被立即调用
    d: {
      handler: 'someMethod',
      immediate: true
    },
    // 调用多个回调
    e: [
      'handle1',
      function handle2 (val, oldVal) { /* ... */ },
      {
        handler: function handle3 (val, oldVal) { /* ... */ },
      }
    ],
    // 侦听表达式
    'e.f': function (val, oldVal) { /* ... */ }
  }
})
vm.a = 2 // => new: 2, old: 1
```

可以看到，`watch`选项的用法非常灵活。首先`watch`选项是一个对象，键是需要观察的表达式，值是对应回调函数。值也可以是方法名，或者包含选项的对象。既然给用户提供的用法灵活，那么在代码中就需要按条件来判断，根据不同的用法做相应的处理。

### 7.2 initWatch函数分析

了解了`watch`选项的用法之后，下面我们就来分析一下`watch`选项的初始化函数`initWatch`的内部原理是怎样的。`initWatch`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function initWatch (vm, watch) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
```



可以看到，在函数内部会遍历`watch`选项，拿到每一项的`key`和对应的值`handler`。然后判断`handler`是否为数组，如果是数组则循环该数组并将数组中的每一项依次调用`createWatcher`函数来创建`watcher`；如果不是数组，则直接调用`createWatcher`函数来创建`watcher`。那么这个`createWatcher`函数是如何创建`watcher`的呢？

### 7.3 createWatcher函数分析

`createWatcher`函数的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}
```

可以看到，该函数接收4个参数，分别是：

- vm:当前实例；
- expOrFn:被侦听的属性表达式
- handler:`watch`选项中每一项的值
- options:用于传递给`vm.$watch`的选项对象

在该函数内部，首先会判断传入的`handler`是否为一个对象，如果是一个对象，那么就认为用户使用的是这种写法：

```javascript
watch: {
    c: {
        handler: function (val, oldVal) { /* ... */ },
		deep: true
    }
}
```

即带有侦听选项的写法，此时就将`handler`对象整体记作`options`，把`handler`对象中的`handler`属性作为真正的回调函数记作`handler`，如下：

```javascript
if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
}
```

接着判断传入的`handler`是否为一个字符串，如果是一个字符串，那么就认为用户使用的是这种写法：

```javascript
watch: {
    // methods选项中的方法名
    b: 'someMethod',
}
```

即回调函数是`methods`选项中的一个方法名，我们知道，在初始化`methods`选项的时候会将选项中的每一个方法都绑定到当前实例上，所以此时我们只需从当前实例上取出该方法作为真正的回调函数记作`handler`，如下：

```javascript
if (typeof handler === 'string') {
    handler = vm[handler]
}
```

如果既不是对象又不是字符串，那么我们就认为它是一个函数，就不做任何处理。

针对不同类型的值处理完毕后，`expOrFn`是被侦听的属性表达式，`handler`变量是回调函数，`options`变量为侦听选项，最后，调用`vm.$watcher`方法（关于该方法在介绍全局实例方法的时候会详细介绍）并传入以上三个参数完成初始化`watch`。

## 8. 总结

本篇文章介绍了生命周期初始化阶段所调用的第五个初始化函数——`initState`。该初始化函数内部总共初始化了5个选项，分别是：`props`、`methods`、`data`、`computed`和`watch`。

这5个选项的初始化顺序不是任意的，而是经过精心安排的。只有按照这种顺序初始化我们才能在开发中在`data`中可以使用`props`，在`watch`中可以观察`data`和`props`。

这5个选项中的所有属性最终都会被绑定到实例上，这也就是我们为什么可以使用`this.xxx`来访问任意属性。同时正是因为这一点，这5个选项中的所有属性名都不应该有所重复，这样会造成属性之间相互覆盖。

最后，我们对这5个选项分别都是如何进行初始化的内部原理进行了逐一分析。
