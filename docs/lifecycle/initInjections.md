---
title: 初始化阶段(initInjections)
---

## 1. 前言

本篇文章介绍生命周期初始化阶段所调用的第四个初始化函数——`initInjections`。从函数名字上来看，该函数是用来初始化实例中的`inject`选项的。说到`inject`选项，那必然离不开`provide`选项，这两个选项都是成对出现的，它们的作用是：允许一个祖先组件向其所有子孙后代注入一个依赖，不论组件层次有多深，并在起上下游关系成立的时间里始终生效。并且

`provide` 选项应该是一个对象或返回一个对象的函数。该对象包含可注入其子孙的属性。在该对象中你可以使用 ES2015 Symbols 作为 key，但是只在原生支持 `Symbol` 和 `Reflect.ownKeys` 的环境下可工作。

`inject` 选项应该是：

- 一个字符串数组，或
- 一个对象，对象的 key 是本地的绑定名，value 是：
  - 在可用的注入内容中搜索用的 key (字符串或 Symbol)，或
  - 一个对象，该对象的：
    - `from` 属性是在可用的注入内容中搜索用的 key (字符串或 Symbol)
    - `default` 属性是降级情况下使用的 value

这两个选项在我们日常开发中使用的频率不是很高，但是在一些组件库中使用的很频繁，官方文档给出了使用示例，如下：

```javascript
// 父级组件提供 'foo'
var Parent = {
  provide: {
    foo: 'bar'
  },
  // ...
}

// 子组件注入 'foo'
var Child = {
  inject: ['foo'],
  created () {
    console.log(this.foo) // => "bar"
  }
  // ...
}
```

利用 ES2015 Symbols、函数 `provide` 和对象 `inject`：

```javascript
const s = Symbol()

const Provider = {
  provide () {
    return {
      [s]: 'foo'
    }
  }
}

const Child = {
  inject: { s },
  // ...
}
```

> 接下来 2 个例子只工作在 Vue 2.2.1 或更高版本。低于这个版本时，注入的值会在 `props` 和 `data` 初始化之后得到。

使用一个注入的值作为一个属性的默认值：

```javascript
const Child = {
  inject: ['foo'],
  props: {
    bar: {
      default () {
        return this.foo
      }
    }
  }
}
```

使用一个注入的值作为数据入口：

```javascript
const Child = {
  inject: ['foo'],
  data () {
    return {
      bar: this.foo
    }
  }
}
```

> 在 2.5.0+ 的注入可以通过设置默认值使其变成可选项：

```javascript
const Child = {
  inject: {
    foo: { default: 'foo' }
  }
}
```

如果它需要从一个不同名字的属性注入，则使用 `from` 来表示其源属性：

```javascript
const Child = {
  inject: {
    foo: {
      from: 'bar',
      default: 'foo'
    }
  }
}
```

与 prop 的默认值类似，你需要对非原始值使用一个工厂方法：

```javascript
const Child = {
  inject: {
    foo: {
      from: 'bar',
      default: () => [1, 2, 3]
    }
  }
}
```

总结起来一句话就是：父组件可以使用`provide`选项给自己的下游子孙组件内注入一些数据，在下游子孙组件中可以使用`inject`选项来接收这些数据以便为自己所用。

另外，这里有一点需要注意：`provide` 和 `inject` 选项绑定的数据不是响应式的。

了解了他们的作用及使用方法后，我们就来看下`initInjections`函数是如何来初始化`inject`选项的。

## 2. initInjections函数分析

分析之前，我们先说一个问题，细心的同学可能会发现，既然`inject`选项和`provide`选项都是成对出现的，那为什么在初始化的时候不一起初始化呢？为什么在`init`函数中调用`initInjections`函数和`initProvide`函数之间穿插一个`initState`函数呢？

其实不然，在官方文档示例中说了，`provide`选项注入的值作为数据入口，如下：

```javascript
const Child = {
  inject: ['foo'],
  data () {
    return {
      bar: this.foo
    }
  }
}
```

这里所说的数据就是我们通常所写`data`、`props`、`watch`、`computed`及`method`，所以`inject`选项接收到注入的值有可能被以上这些数据所使用到，所以在初始化完`inject`后需要先初始化这些数据，然后才能再初始化`provide`，所以在调用`initInjections`函数对`inject`初始化完之后需要先调用`initState`函数对数据进行初始化，最后再调用`initProvide`函数对`provide`进行初始化。

OK，接下来我们就来分析`initInjections`函数的具体原理，该函数定义位于源码的`src/core/instance/inject.js`中，如下：

```javascript
export function initInjections (vm: Component) {
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      defineReactive(vm, key, result[key])
    }
    toggleObserving(true)
  }
}

export let shouldObserve: boolean = true
export function toggleObserving (value: boolean) {
  shouldObserve = value
}
```

可以看到，`initInjections`函数的逻辑并不复杂，首先调用`resolveInject`把`inject`选项中的数据转化成键值对的形式赋给`result`，如官方文档给出的例子，那么`result`应为如下样子：

```javascript
// 父级组件提供 'foo'
var Parent = {
  provide: {
    foo: 'bar'
  }
}

// 子组件注入 'foo'
var Child = {
  inject: ['foo'],
}

// result
result = {
    'foo':'bar'
}
```

然后遍历`result`中的每一对键值，调用`defineReactive`函数将其添加当前实例上，如下：

```javascript
if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
        defineReactive(vm, key, result[key])
    }
    toggleObserving(true)
}
```

此处有一个地方需要注意，在把`result`中的键值添加到当前实例上之前，会先调用`toggleObserving(false)`，而这个函数内部是把`shouldObserve = false`，这是为了告诉`defineReactive`函数仅仅是把键值添加到当前实例上而不需要将其转换成响应式，这个就呼应了官方文档在介绍`provide` 和 `inject` 选项用法的时候所提示的：

> `provide` 和 `inject` 绑定并不是可响应的。这是刻意为之的。然而，如果你传入了一个可监听的对象，那么其对象的属性还是可响应的。

`initInjections`函数的逻辑就介绍完了，接下来我们看看`resolveInject`函数内部是如何把`inject` 选项中数据转换成键值对的。

### resolveInject函数分析

我们知道，`inject` 选项中的每一个数据`key`都是由其上游父级组件提供的，所以我们应该把每一个数据`key`从当前组件起，不断的向上游父级组件中查找该数据`key`对应的值，直到找到为止。如果在上游所有父级组件中没找到，那么就看在`inject` 选项是否为该数据`key`设置了默认值，如果设置了就使用默认值，如果没有设置，则抛出异常。

OK，以上是我们的分析，下面我们就来看下`resolveInject`函数的源码，验证我们的分析，源码如下：

```javascript
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    const result = Object.create(null)
    const keys =  Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const provideKey = inject[key].from
      let source = vm
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
```

在分析函数源码之前，我们对照着官网给出的示例，这样会比较好理解一些。

```javascript
var Parent = {
  provide: {
    foo: 'bar'
  },
  // ...
}
const Child = {
  inject: {
    foo: {
      from: 'bar',
      default: () => [1, 2, 3]
    }
  }
}
```



可以看到，在函数源码中，首先创建一个空对象`result`，用来存储`inject` 选项中的数据`key`及其对应的值，作为最后的返回结果。

然后获取当前`inject` 选项中的所有`key`，然后遍历每一个`key`，拿到每一个`key`的`from`属性记作`provideKey`，`provideKey`就是上游父级组件提供的源属性，然后开启一个`while`循环，从当前组件起，不断的向上游父级组件的`_provided`属性中（父级组件使用`provide`选项注入数据时会将注入的数据存入自己的实例的`_provided`属性中）查找，直到查找到源属性的对应的值，将其存入`result`中，如下：

```javascript
for (let i = 0; i < keys.length; i++) {
  const key = keys[i]
  const provideKey = inject[key].from
  let source = vm
  while (source) {
    if (source._provided && hasOwn(source._provided, provideKey)) {
      result[key] = source._provided[provideKey]
      break
    }
    source = source.$parent
  }
}
```

如果没有找到，那么就看`inject` 选项中当前的数据`key`是否设置了默认值，即是否有`default`属性，如果有的话，则拿到这个默认值，官方文档示例中说了，默认值可以为一个工厂函数，所以当默认值是函数的时候，就去该函数的返回值，否则就取默认值本身。如果没有设置默认值，则抛出异常。如下：

```javascript
if (!source) {
  if ('default' in inject[key]) {
    const provideDefault = inject[key].default
    result[key] = typeof provideDefault === 'function'
        ? provideDefault.call(vm)
    : provideDefault
  } else if (process.env.NODE_ENV !== 'production') {
    warn(`Injection "${key}" not found`, vm)
  }
}
```

最后将`result`返回。这就是`resolveInject`函数的所有逻辑。

此时你可能会有个疑问，官方文档中说`inject` 选项可以是一个字符串数组，也可以是一个对象，在上面的代码中只看见了处理当为对象的情况，那如果是字符串数组呢？怎么没有处理呢？

其实在初始化阶段`_init`函数在合并属性的时候还调用了一个将`inject` 选项数据规范化的函数`normalizeInject`，该函数的作用是将以下这三种写法：

```javascript
// 写法一
var Child = {
  inject: ['foo']
}

// 写法二
const Child = {
  inject: {
    foo: { default: 'xxx' }
  }
}

// 写法三
const Child = {
  inject: {
    foo
  }
}
```

统统转换成以下规范化格式：

```javascript
const Child = {
  inject: {
    foo: {
      from: 'foo',
      default: 'xxx'  //如果有默认的值就有default属性
    }
  }
}
```

这样做的目的是，不管用户使用了何种写法，统统将其转化成一种便于集中处理的写法。

该函数的定义位于源码的`src/core/util/options.js`中，如下：

```javascript
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}
```

该函数的逻辑并不复杂，如果用户给`inject`选项传入的是一个字符串数组（写法一），那么就遍历该数组，把数组的每一项变成

```javascript
inject:{
  foo:{
    from:'foo'
  }
}
```

如果给`inject`选项传入的是一个对象，那就遍历对象中的每一个`key`，给写法二形式的`key`对应的值扩展`{ from: key }`，变成：

```javascript
inject:{
  foo:{
    from: 'foo',
    default: 'xxx'
  }
}
```

将写法三形式的`key`对应的值变成：

```javascript
inject:{
  foo:{
    from: 'foo'
  }
}
```

总之一句话就是把各种写法转换成一种规范化写法，便于集中处理。

## 3. 总结

本篇文章介绍生命周期初始化阶段所调用的第四个初始化函数——`initInjections`。该函数是用来初始化`inject`选项的。

由于`inject`选项在日常开发中使用频率不高，所以首先我们先根据官方文档回顾了该选项的作用及使用方法。

接着，我们分析了`initInjections`函数的内部实现原理，分析了是根据`inject`选项中的数据`key`是如何自底向上查找上游父级组件所注入的对应的值。

另外，对`inject`选项的规范化函数`normalizeInject`也进行了分析，`Vue`为用户提供了自由多种的写法，其内部是将各种写法最后进行统一规范化处理。


