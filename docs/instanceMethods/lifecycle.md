---
title: 生命周期相关的方法
---

## 0. 前言

与生命周期相关的实例方法有4个，分别是`vm.$mount`、`vm.$forceUpdate`、`vm.$nextTick`和`vm.$destory`。其中，`$forceUpdate`和`$destroy`方法是在`lifecycleMixin`函数中挂载到`Vue`原型上的，`$nextTick`方法是在`renderMixin`函数中挂载到`Vue`原型上的，而`$mount`方法是在跨平台的代码中挂载到`Vue`原型上的。代码如下：

```javascript
export function lifecycleMixin (Vue) {
    Vue.prototype.$forceUpdate = function () {}
    Vue.prototype.$destroy = function (fn) {}
}

export function renderMixin (Vue) {
    Vue.prototype.$nextTick = function (fn) {}
}
```

当执行`lifecycleMixin`和`renderMixin`函数后，会向`Vue`原型上挂载相应的实例方法。

接下来，我们就来分析这4个与生命周期相关的实例方法其内部的原理都是怎样的。

## 1. vm.$mount

### 1.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$mount( [elementOrSelector] )
```

- **参数**：

  - `{Element | string} [elementOrSelector]`
  - `{boolean} [hydrating]`

- **返回值**：`vm` - 实例自身

- **作用**：

  如果 `Vue` 实例在实例化时没有收到 el 选项，则它处于“未挂载”状态，没有关联的 DOM 元素。可以使用 `vm.$mount()` 手动地挂载一个未挂载的实例。

  如果没有提供 `elementOrSelector` 参数，模板将被渲染为文档之外的的元素，并且你必须使用原生 `DOM API `把它插入文档中。

  这个方法返回实例自身，因而可以链式调用其它实例方法。

### 1.2 内部原理

关于该方法的内部原理在介绍**生命周期篇的模板编译阶段**中已经详细分析过，此处不再重复。

## 2. vm.$forceUpdate

### 2.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$forceUpdate()
```

- **作用**：

  迫使 `Vue` 实例重新渲染。注意它仅仅影响实例本身和插入插槽内容的子组件，而不是所有子组件。

### 2.2 内部原理

通过用法回顾我们知道， 该方法是用来迫使`Vue` 实例重新渲染的。也就是说，当调用了该方法，当前实例会立即重新渲染。

在分析原理之前，我们先思考这样一个问题：什么情况下实例会重新渲染？那就是当实例依赖的数据发生变化时，变化的数据会通知其收集的依赖列表中的依赖进行更新，在之前的文章中我们说过，收集依赖就是收集`watcher`，依赖更新就是`watcher`调用`update`方法更新，所以实例依赖的数据发生变化时，就会通知实例`watcher`去执行`update`方法进行更新。

那么我们就知道了，实例的重新渲染其实就是实例`watcher`执行了`update`方法。

OK，有了这个概念之后，接下来我们来分析`$forceUpdate`源码实现，代码如下：

```javascript
Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
        vm._watcher.update()
    }
}
```

可以看到，源码实现的逻辑跟我们上面分析的是一致的。在之前的文章中我们说过，当前实例的`_watcher`属性就是该实例的`watcher`，所以要想让实例重新渲染，我们只需手动的去执行一下实例`watcher`的`update`方法即可。



## 3. vm.$nextTick

`vm.$nextTick` 是全局 `Vue.nextTick` 的**别名**，其用法相同。

### 3.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$nextTick( [callback] )
```

- **参数**：

  - `{Function} [callback]`

- **用法**：

  将回调延迟到下次 DOM 更新循环之后执行。在修改数据之后立即使用它，然后等待 DOM 更新。它跟全局方法 `Vue.nextTick` 一样，不同的是回调的 `this` 自动绑定到调用它的实例上。

  > 2.1.0 起新增：如果没有提供回调且在支持 Promise 的环境中，则返回一个 Promise。请注意 Vue 不自带 Promise 的 polyfill，所以如果你的目标浏览器不是原生支持 Promise (IE：你们都看我干嘛)，你得自行 polyfill。

从上面的官方文档对`$nextTick`方法的介绍中我们似乎还是不能理解该方法的作用，那么我们举个例子看一下，如下：

```vue
<template>
	<div id="example">{{message}}</div>
</template>
<script>
    var vm = new Vue({
      el: '##example',
      data: {
        message: '123'
      }
    })
    vm.message = 'new message' // 更改数据
    console.log(vm.$el.innerHTML) // '123'
    Vue.nextTick(function () {
      console.log(vm.$el.innerHTML) // 'new message'
    })
</script>
```

在上面例子中，当我们更新了`message`的数据后，立即获取`vm.$el.innerHTML`，发现此时获取到的还是更新之前的数据：123。但是当我们使用`nextTick`来获取`vm.$el.innerHTML`时，此时就可以获取到更新后的数据了。这是为什么呢？

这里就涉及到`Vue`中对`DOM`的更新策略了，`Vue` 在更新 `DOM` 时是**异步**执行的。只要侦听到数据变化，`Vue` 将开启一个事件队列，并缓冲在同一事件循环中发生的所有数据变更。如果同一个 `watcher` 被多次触发，只会被推入到事件队列中一次。这种在缓冲时去除重复数据对于避免不必要的计算和 `DOM` 操作是非常重要的。然后，在下一个的事件循环“tick”中，`Vue` 刷新事件队列并执行实际 (已去重的) 工作。

在上面这个例子中，当我们通过 `vm.message = 'new message'`更新数据时，此时该组件不会立即重新渲染。当刷新事件队列时，组件会在下一个事件循环“tick”中重新渲染。所以当我们更新完数据后，此时又想基于更新后的 `DOM` 状态来做点什么，此时我们就需要使用`Vue.nextTick(callback)`，把基于更新后的`DOM` 状态所需要的操作放入回调函数`callback`中，这样回调函数将在 `DOM` 更新完成后被调用。

OK，现在大家应该对`nextTick`是什么、为什么要有`nextTick`以及怎么使用`nextTick`有个大概的了解了。那么问题又来了，`Vue`为什么要这么设计？为什么要异步更新`DOM`？这就涉及到另外一个知识：`JS`的运行机制。

### 3.2 JS的运行机制

我们知道 `JS` 执行是单线程的，它是基于事件循环的。事件循环大致分为以下几个步骤：

1. 所有同步任务都在主线程上执行，形成一个执行栈（`execution context stack`）。
2. 主线程之外，还存在一个"任务队列"（`task queue`）。只要异步任务有了运行结果，就在"任务队列"之中放置一个事件。
3. 一旦"执行栈"中的所有同步任务执行完毕，系统就会读取"任务队列"，看看里面有哪些事件。那些对应的异步任务，于是结束等待状态，进入执行栈，开始执行。
4. 主线程不断重复上面的第三步。

主线程的执行过程就是一个 `tick`，而所有的异步结果都是通过 “任务队列” 来调度。 任务队列中存放的是一个个的任务（`task`）。 规范中规定 `task` 分为两大类，分别是宏任务(`macro task`) 和微任务(`micro task`），并且每执行完一个个宏任务(`macro task`)后，都要去清空该宏任务所对应的微任务队列中所有的微任务(`micro task`），他们的执行顺序如下所示：

```javascript
for (macroTask of macroTaskQueue) {
    // 1. 处理当前的宏任务
    handleMacroTask();

    // 2. 处理对应的所有微任务
    for (microTask of microTaskQueue) {
        handleMicroTask(microTask);
    }
}
```

在浏览器环境中，常见的

- 宏任务(`macro task`) 有 `setTimeout`、`MessageChannel`、`postMessage`、`setImmediate`；
- 微任务(`micro task`）有`MutationObsever` 和 `Promise.then`。

OK，有了这个概念之后，接下来我们就进入正菜：从`Vue`源码角度来分析`nextTick`的实现原理。

### 3.3 内部原理

`nextTick` 的定义位于源码的`src/core/util/next-tick.js`中，其大概可分为两大部分：

1. 能力检测
2. 根据能力检测以不同方式执行回调队列

#### 能力检测

`Vue` 在内部对异步队列尝试使用原生的 `Promise.then`、`MutationObserver` 和 `setImmediate`，如果执行环境不支持，则会采用 `setTimeout(fn, 0)` 代替。

宏任务耗费的时间是大于微任务的，所以在浏览器支持的情况下，优先使用微任务。如果浏览器不支持微任务，使用宏任务；但是，各种宏任务之间也有效率的不同，需要根据浏览器的支持情况，使用不同的宏任务。

这一部分的源码如下：

```javascript
let microTimerFunc
let macroTimerFunc
let useMacroTask = false

/* 对于宏任务(macro task) */
// 检测是否支持原生 setImmediate(高版本 IE 和 Edge 支持)
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    macroTimerFunc = () => {
        setImmediate(flushCallbacks)
    }
}
// 检测是否支持原生的 MessageChannel
else if (typeof MessageChannel !== 'undefined' && (
    isNative(MessageChannel) ||
    // PhantomJS
    MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
    const channel = new MessageChannel()
    const port = channel.port2
    channel.port1.onmessage = flushCallbacks
    macroTimerFunc = () => {
        port.postMessage(1)
    }
}
// 都不支持的情况下，使用setTimeout
else {
    macroTimerFunc = () => {
        setTimeout(flushCallbacks, 0)
    }
}

/* 对于微任务(micro task) */
// 检测浏览器是否原生支持 Promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {
    const p = Promise.resolve()
    microTimerFunc = () => {
        p.then(flushCallbacks)
    }
}
// 不支持的话直接指向 macro task 的实现。
else {
    // fallback to macro
    microTimerFunc = macroTimerFunc
}
```

首先声明了两个变量： `microTimerFunc` 和 `macroTimerFunc` ，它们分别对应的是 `micro task` 的函数和 `macro task` 的函数。对于 `macro task` 的实现，优先检测是否支持原生 `setImmediate`，这是一个高版本 `IE` 和`Edge` 才支持的特性，不支持的话再去检测是否支持原生的 `MessageChannel`，如果也不支持的话就会降级为 `setTimeout 0`；而对于 `micro task` 的实现，则检测浏览器是否原生支持 `Promise`，不支持的话直接指向 `macro task` 的实现。

#### 执行回调队列

接下来就进入了核心函数`nextTick`中，如下：

```javascript
const callbacks = []   // 回调队列
let pending = false    // 异步锁

// 执行队列中的每一个回调
function flushCallbacks () {
    pending = false     // 重置异步锁
    // 防止出现nextTick中包含nextTick时出现问题，在执行回调函数队列前，提前复制备份并清空回调函数队列
    const copies = callbacks.slice(0)
    callbacks.length = 0
    // 执行回调函数队列
    for (let i = 0; i < copies.length; i++) {
        copies[i]()
    }
}

export function nextTick (cb?: Function, ctx?: Object) {
    let _resolve
    // 将回调函数推入回调队列
    callbacks.push(() => {
        if (cb) {
            try {
                cb.call(ctx)
            } catch (e) {
                handleError(e, ctx, 'nextTick')
            }
        } else if (_resolve) {
            _resolve(ctx)
        }
    })
    // 如果异步锁未锁上，锁上异步锁，调用异步函数，准备等同步函数执行完后，就开始执行回调函数队列
    if (!pending) {
        pending = true
        if (useMacroTask) {
            macroTimerFunc()
        } else {
            microTimerFunc()
        }
    }
    // 如果没有提供回调，并且支持Promise，返回一个Promise
    if (!cb && typeof Promise !== 'undefined') {
        return new Promise(resolve => {
            _resolve = resolve
        })
    }
}
```

首先，先来看 `nextTick`函数，该函数的主要逻辑是：先把传入的回调函数 `cb` 推入 回调队列`callbacks` 数组，同时在接收第一个回调函数时，执行能力检测中对应的异步方法（异步方法中调用了回调函数队列）。最后一次性地根据 `useMacroTask` 条件执行 `macroTimerFunc` 或者是 `microTimerFunc`，而它们都会在下一个 tick 执行 `flushCallbacks`，`flushCallbacks` 的逻辑非常简单，对 `callbacks` 遍历，然后执行相应的回调函数。

`nextTick` 函数最后还有一段逻辑：

```javascript
if (!cb && typeof Promise !== 'undefined') {
  return new Promise(resolve => {
    _resolve = resolve
  })
}
```

这是当 `nextTick` 不传 `cb` 参数的时候，提供一个 Promise 化的调用，比如：

```javascript
nextTick().then(() => {})
```

当 `_resolve` 函数执行，就会跳到 `then` 的逻辑中。

这里有两个问题需要注意：

1. 如何保证只在接收第一个回调函数时执行异步方法？

   `nextTick`源码中使用了一个异步锁的概念，即接收第一个回调函数时，先关上锁，执行异步方法。此时，浏览器处于等待执行完同步代码就执行异步代码的情况。

2. 执行 `flushCallbacks` 函数时为什么需要备份回调函数队列？执行的也是备份的回调函数队列？

   因为，会出现这么一种情况：`nextTick` 的回调函数中还使用 `nextTick`。如果 `flushCallbacks` 不做特殊处理，直接循环执行回调函数，会导致里面`nextTick` 中的回调函数会进入回调队列。



以上就是对 `nextTick` 的源码分析，我们了解到数据的变化到 `DOM` 的重新渲染是一个异步过程，发生在下一个 tick。当我们在实际开发中，比如从服务端接口去获取数据的时候，数据做了修改，如果我们的某些方法去依赖了数据修改后的 DOM 变化，我们就必须在 `nextTick` 后执行。



## 4. vm.$destory

### 4.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$destroy()
```

- **用法**：

  完全销毁一个实例。清理它与其它实例的连接，解绑它的全部指令及事件监听器。

  触发 `beforeDestroy` 和 `destroyed` 的钩子。

### 4.2 内部原理

关于该方法的内部原理在介绍**生命周期篇的销毁阶段**中已经详细分析过，此处不再重复。



