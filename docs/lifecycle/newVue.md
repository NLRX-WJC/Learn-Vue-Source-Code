---
title: 初始化阶段(new Vue)
---

## 1. 前言

上篇文章中介绍了`Vue`实例的生命周期大致分为4个阶段，那么首先我们先从第一个阶段——初始化阶段开始入手分析。从生命周期流程图中我们可以看到，初始化阶段所做的工作也可大致分为两部分：第一部分是`new Vue()`，也就是创建一个`Vue`实例；第二部分是为创建好的`Vue`实例初始化一些事件、属性、响应式数据等。接下来我们就从源码角度来深入分析一下初始化阶段所做的工作及其内部原理。

## 2. new Vue()都干了什么

初始化阶段所做的第一件事就是`new Vue()`创建一个`Vue`实例，那么`new Vue()`的内部都干了什么呢？ 我们知道，`new` 关键字在 `JS`中表示从一个类中实例化出一个对象来，由此可见， `Vue` 实际上是一个类。所以`new Vue()`实际上是执行了`Vue`类的构造函数，那么我们来看一下`Vue`类是如何定义的，`Vue`类的定义是在源码的`src/core/instance/index.js` 中，如下：

```javascript
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
```

可以看到，`Vue`类的定义非常简单，其构造函数核心就一行代码：

```javascript
this._init(options)
```

调用原型上的`_init(options)`方法并把用户所写的选项`options`传入。那这个`_init`方法是从哪来的呢？在`Vue`类定义的下面还有几行代码，其中之一就是：

```javascript
initMixin(Vue)
```

这一行代码执行了`initMixin`函数，那`initMixin`函数又是从哪儿来的呢？该函数定义位于源码的`src/core/instance/init.js` 中，如下：

```javascript
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    const vm = this
    vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
    )
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
```

可以看到，在`initMixin`函数内部就只干了一件事，那就是给`Vue`类的原型上绑定`_init`方法，同时`_init`方法的定义也在该函数内部。现在我们知道了，`new Vue()`会执行`Vue`类的构造函数，构造函数内部会执行`_init`方法，所以`new Vue()`所干的事情其实就是`_init`方法所干的事情，那么我们着重来分析下`_init`方法都干了哪些事情。

首先，把`Vue`实例赋值给变量`vm`，并且把用户传递的`options`选项与当前构造函数的`options`属性及其父级构造函数的`options`属性进行合并（关于属性如何合并的问题下面会介绍），得到一个新的`options`选项赋值给`$options`属性，并将`$options`属性挂载到`Vue`实例上，如下：

```javascript
vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
)
```

接着，通过调用一些初始化函数来为`Vue`实例初始化一些属性，事件，响应式数据等，如下：

```javascript
initLifecycle(vm)       // 初始化生命周期
initEvents(vm)        // 初始化事件
initRender(vm)         // 初始化渲染
callHook(vm, 'beforeCreate')  // 调用生命周期钩子函数
initInjections(vm)   //初始化injections
initState(vm)    // 初始化props,methods,data,computed,watch
initProvide(vm) // 初始化 provide
callHook(vm, 'created')  // 调用生命周期钩子函数
```

可以看到，除了调用初始化函数来进行相关数据的初始化之外，还在合适的时机调用了`callHook`函数来触发生命周期的钩子，关于`callHook`函数是如何触发生命周期的钩子会在下面介绍，我们先继续往下看：

```javascript
if (vm.$options.el) {
    vm.$mount(vm.$options.el)
}
```

在所有的初始化工作都完成以后，最后，会判断用户是否传入了`el`选项，如果传入了则调用`$mount`函数进入模板编译与挂载阶段，如果没有传入`el`选项，则不进入下一个生命周期阶段，需要用户手动执行`vm.$mount`方法才进入下一个生命周期阶段。

以上就是`new Vue()`所做的所有事情，可以看到，整个初始化阶段都是在`new Vue()`里完成的，关于`new Vue()`里调用的一些初始化函数具体是如何进行初始化的，我们将在接下来的几篇文章里逐一介绍。下面我们先来看看上文中遗留的属性合并及`callHook`函数是如何触发生命周期的钩子的问题。

## 3. 合并属性

在上文中，`_init`方法里首先会调用`mergeOptions`函数来进行属性合并，如下：

```javascript
vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
)
```



 它实际上就是把 `resolveConstructorOptions(vm.constructor)` 的返回值和 `options` 做合并，`resolveConstructorOptions` 的实现先不考虑，可简单理解为返回 `vm.constructor.options`，相当于 `Vue.options`，那么这个 `Vue.options`又是什么呢，其实在 `initGlobalAPI(Vue)` 的时候定义了这个值，代码在 `src/core/global-api/index.js` 中：

```javascript
export function initGlobalAPI (Vue: GlobalAPI) {
  // ...
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  extend(Vue.options.components, builtInComponents)
  // ...
}
```

 首先通过 `Vue.options = Object.create(null)` 创建一个空对象，然后遍历 `ASSET_TYPES`，`ASSET_TYPES` 的定义在 `src/shared/constants.js` 中：

```javascript
export const ASSET_TYPES = [
  'component',
  'directive',
  'filter'
]
```

所以上面遍历 `ASSET_TYPES` 后的代码相当于：

```js
Vue.options.components = {}
Vue.options.directives = {}
Vue.options.filters = {}
```

最后通过 `extend(Vue.options.components, builtInComponents)` 把一些内置组件扩展到 `Vue.options.components` 上，`Vue` 的内置组件目前 有`<keep-alive>`、`<transition>` 和`<transition-group>` 组件，这也就是为什么我们在其它组件中使用这些组件不需要注册的原因。

 那么回到 `mergeOptions` 这个函数，它的定义在 `src/core/util/options.js` 中：

```javascript
/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {

  if (typeof child === 'function') {
    child = child.options
  }
  const extendsFrom = child.extends
  if (extendsFrom) {
    parent = mergeOptions(parent, extendsFrom, vm)
  }
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
```

可以看出，`mergeOptions`函数的 主要功能是把 `parent` 和 `child` 这两个对象根据一些合并策略，合并成一个新对象并返回。首先递归把 `extends` 和 `mixins` 合并到 `parent` 上，

```javascript
 const extendsFrom = child.extends
  if (extendsFrom) {
    parent = mergeOptions(parent, extendsFrom, vm)
  }
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
```

然后创建一个空对象`options`，遍历 `parent`，把`parent`中的每一项通过调用 `mergeField`函数合并到空对象`options`里，

```javascript
const options = {}
let key
for (key in parent) {
    mergeField(key)
}
```

接着再遍历 `child`，把存在于`child`里但又不在 `parent`中 的属性继续调用 `mergeField`函数合并到空对象`options`里，

```javascript
for (key in child) {
    if (!hasOwn(parent, key)) {
        mergeField(key)
    }
}
```

最后，`options`就是最终合并后得到的结果，将其返回。

这里值得一提的是 `mergeField` 函数，它不是简单的把属性从一个对象里复制到另外一个对象里，而是根据被合并的不同的选项有着不同的合并策略。例如，对于`data`有`data`的合并策略，即该文件中的`strats.data`函数；对于`watch`有`watch`的合并策略，即该文件中的`strats.watch`函数等等。这就是设计模式中非常典型的**策略模式**。

关于这些合并策略都很简单，我们不一一展开介绍，仅介绍生命周期钩子函数的合并策略，因为我们后面会用到。生命周期钩子函数的合并策略如下：

```javascript
/**
 * Hooks and props are merged as arrays.
 */
function mergeHook (parentVal,childVal):  {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})
```

 这其中的 `LIFECYCLE_HOOKS` 的定义在 `src/shared/constants.js` 中：

```javascript
export const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured'
]
```

 这里定义了所有钩子函数名称，所以对于钩子函数的合并策略都是 `mergeHook` 函数。`mergeHook` 函数的实现用了一个多层嵌套的三元运算符，如果嵌套太深不好理解的话我们可以将其展开，如下：

 ```javascript
function mergeHook (parentVal,childVal):  {
  if (childVal) {
    if (parentVal) {
      return parentVal.concat(childVal)
    } else {
      if (Array.isArray(childVal)) {
        return childVal
      } else {
        return [childVal]
      }
    }
  } else {
    return parentVal
  }
}
 ```

 从展开后的代码中可以看到，它的合并策略是这样子的：如果 `childVal`不存在，就返回 `parentVal`；否则再判断是否存在 `parentVal`，如果存在就把 `childVal` 添加到 `parentVal` 后返回新数组；否则返回 `childVal` 的数组。所以回到 `mergeOptions` 函数，一旦 `parent` 和 `child` 都定义了相同的钩子函数，那么它们会把 2 个钩子函数合并成一个数组。

那么问题来了，为什么要把相同的钩子函数转换成数组呢？这是因为`Vue`允许用户使用`Vue.mixin`方法（关于该方法会在后面章节中介绍）向实例混入自定义行为，`Vue`的一些插件通常都是这么做的。所以当`Vue.mixin`和用户在实例化`Vue`时，如果设置了同一个钩子函数，那么在触发钩子函数时，就需要同时触发这个两个函数，所以转换成数组就是为了能在同一个生命周期钩子列表中保存多个钩子函数。

## 4. callHook函数如何触发钩子函数

关于`callHook`函数如何触发钩子函数的问题，我们只需看一下该函数的实现源码即可，该函数的源码位于`src/core/instance/lifecycle.js` 中，如下：

```javascript
export function callHook (vm: Component, hook: string) {
  const handlers = vm.$options[hook]
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      try {
        handlers[i].call(vm)
      } catch (e) {
        handleError(e, vm, `${hook} hook`)
      }
    }
  }
}
```

可以看到，`callHook`函数逻辑非常简单。首先从实例的`$options`中获取到需要触发的钩子名称所对应的钩子函数数组`handlers`，我们说过，每个生命周期钩子名称都对应了一个钩子函数数组。然后遍历该数组，将数组中的每个钩子函数都执行一遍。

## 5. 总结

本篇文章介绍了生命周期第一个阶段——初始化阶段中所做的第一件事：`new Vue()`。

首先，分析了`new Vue()`时其内部都干了些什么。其主要逻辑就是：合并配置，调用一些初始化函数，触发生命周期钩子函数，调用`$mount`开启下一个阶段。

接着，就合并属性进行了详细介绍，知道了对于不同的选项有着不同的合并策略，并挑出钩子函数的合并策略进行了分析。

最后，分析了`callHook`函数的源码，知道了`callHook`函数如何触发钩子函数的。

接下来后面几篇文章将对调用的这些初始化函数进行逐个分析。
