---
title: 事件相关的方法
---

## 0. 前言

与事件相关的实例方法有4个，分别是`vm.$on`、`vm.$emit`、`vm.$off`和`vm.$once`。它们是在`eventsMixin`函数中挂载到`Vue`原型上的，代码如下：

```javascript
export function eventsMixin (Vue) {
    Vue.prototype.$on = function (event, fn) {}
    Vue.prototype.$once = function (event, fn) {}
    Vue.prototype.$off = function (event, fn) {}
    Vue.prototype.$emit = function (event) {}
}
```

当执行`eventsMixin`函数后，会向`Vue`原型上挂载上述4个实例方法。

 接下来，我们就来分析这4个与事件相关的实例方法其内部的原理都是怎样的。

## 1. vm.$on

### 1.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$on( event, callback )
```

- **参数**：

  - `{string | Array<string>} event` (数组只在 2.2.0+ 中支持)
  - `{Function} callback`

- **作用**：

  监听当前实例上的自定义事件。事件可以由`vm.$emit`触发。回调函数会接收所有传入事件触发函数的额外参数。

- **示例**：

  ```javascript
  vm.$on('test', function (msg) {
    console.log(msg)
  })
  vm.$emit('test', 'hi')
  // => "hi"
  ```

### 1.2 内部原理

在介绍内部原理之前，我们先有一个这样的概念：`$on`和`$emit`这两个方法的内部原理是设计模式中最典型的发布订阅模式，首先定义一个事件中心，通过`$on`订阅事件，将事件存储在事件中心里面，然后通过`$emit`触发事件中心里面存储的订阅事件。

OK，有了这个概念之后，接下来，我们就先来看看`$on`方法的内部原理。该方法的定义位于源码的`src/core/instance/event.js`中，如下：

```javascript
Vue.prototype.$on = function (event, fn) {
    const vm: Component = this
    if (Array.isArray(event)) {
        for (let i = 0, l = event.length; i < l; i++) {
            this.$on(event[i], fn)
        }
    } else {
        (vm._events[event] || (vm._events[event] = [])).push(fn)
    }
    return vm
}
```

`$on`方法接收两个参数，第一个参数是订阅的事件名，可以是数组，表示订阅多个事件。第二个参数是回调函数，当触发所订阅的事件时会执行该回调函数。

首先，判断传入的事件名是否是一个数组，如果是数组，就表示需要一次性订阅多个事件，就遍历该数组，将数组中的每一个事件都递归调用`$on`方法将其作为单个事件订阅。如下：

```javascript
if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
    }
}
```

如果不是数组，那就当做单个事件名来处理，以该事件名作为`key`，先尝试在当前实例的`_events`属性中获取其对应的事件列表，如果获取不到就给其赋空数组为默认值，并将第二个参数回调函数添加进去。如下：

```javascript
else {
    (vm._events[event] || (vm._events[event] = [])).push(fn)
}
```

那么问题来了，当前实例的`_events`属性是干嘛的呢？

还记得我们在介绍生命周期初始化阶段的初始化事件`initEvents`函数中，在该函数中，首先在当前实例上绑定了`_events`属性并给其赋值为空对象，如下：

```javascript
export function initEvents (vm: Component) {
    vm._events = Object.create(null)
    // ...

}
```

这个`_events`属性就是用来作为当前实例的事件中心，所有绑定在这个实例上的事件都会存储在事件中心`_events`属性中。

以上，就是`$on`方法的内部原理。

## 2. vm.$emit

### 2.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$emit( eventName, […args] )
```

- **参数**：
  - `{string} eventName`
  - `[...args]`
- **作用**：
  触发当前实例上的事件。附加参数都会传给监听器回调。

### 2.2 内部原理

该方法接收的第一个参数是要触发的事件名，之后的附加参数都会传给被触发事件的回调函数。该方法的定义位于源码的`src/core/instance/event.js`中，如下：

```javascript
Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
}
```

该方法的逻辑很简单，就是根据传入的事件名从当前实例的`_events`属性（即事件中心）中获取到该事件名所对应的回调函数`cbs`，如下：

```javascript
let cbs = vm._events[event]
```

然后再获取传入的附加参数`args`，如下：

```javascript
const args = toArray(arguments, 1)
```

由于`cbs`是一个数组，所以遍历该数组，拿到每一个回调函数，执行回调函数并将附加参数`args`传给该回调。如下：

```javascript
for (let i = 0, l = cbs.length; i < l; i++) {
    try {
        cbs[i].apply(vm, args)
    } catch (e) {
        handleError(e, vm, `event handler for "${event}"`)
    }
}
```

以上，就是`$emit`方法的内部原理。



## 3. vm.$off

### 3.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$off( [event, callback] )
```

- **参数**：

  - `{string | Array<string>} event` (只在 2.2.2+ 支持数组)
  - `{Function} [callback]`

- **作用**：

  移除自定义事件监听器。

  - 如果没有提供参数，则移除所有的事件监听器；
  - 如果只提供了事件，则移除该事件所有的监听器；
  - 如果同时提供了事件与回调，则只移除这个回调的监听器。

### 3.2 内部原理

通过用法回顾我们知道，该方法用来移除事件中心里面某个事件的回调函数，根据所传入参数的不同，作出不同的处理。该方法的定义位于源码的`src/core/instance/event.js`中，如下：

```javascript
Vue.prototype.$off = function (event, fn) {
    const vm: Component = this
    // all
    if (!arguments.length) {
        vm._events = Object.create(null)
        return vm
    }
    // array of events
    if (Array.isArray(event)) {
        for (let i = 0, l = event.length; i < l; i++) {
            this.$off(event[i], fn)
        }
        return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
        return vm
    }
    if (!fn) {
        vm._events[event] = null
        return vm
    }
    if (fn) {
        // specific handler
        let cb
        let i = cbs.length
        while (i--) {
            cb = cbs[i]
            if (cb === fn || cb.fn === fn) {
                cbs.splice(i, 1)
                break
            }
        }
    }
    return vm
}
```

可以看到，在该方法内部就是通过不断判断所传参数的情况进而进行不同的逻辑处理，接下来我们逐行分析。

首先，判断如果没有传入任何参数（即`arguments.length`为0），这就是第一种情况：如果没有提供参数，则移除所有的事件监听器。我们知道，当前实例上的所有事件都存储在事件中心`_events`属性中，要想移除所有的事件，那么只需把`_events`属性重新置为空对象即可。如下：

```javascript
if (!arguments.length) {
    vm._events = Object.create(null)
    return vm
}
```

接着，判断如果传入的需要移除的事件名是一个数组，就表示需要一次性移除多个事件，那么我们只需同订阅多个事件一样，遍历该数组，然后将数组中的每一个事件都递归调用`$off`方法进行移除即可。如下：

```javascript
if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
    }
    return vm
}
```

接着，获取到需要移除的事件名在事件中心中对应的回调函数`cbs`。如下：

```javascript
const cbs = vm._events[event]
```

接着，判断如果`cbs`不存在，那表明在事件中心从来没有订阅过该事件，那就谈不上移除该事件，直接返回，退出程序即可。如下：

```javascript
if (!cbs) {
    return vm
}
```

接着，如果`cbs`存在，但是没有传入回调函数`fn`，这就是第二种情况：如果只提供了事件，则移除该事件所有的监听器。这个也不难，我们知道，在事件中心里面，一个事件名对应的回调函数是一个数组，要想移除所有的回调函数我们只需把它对应的数组设置为`null`即可。如下：

```javascript
if (!fn) {
    vm._events[event] = null
    return vm
}
```

接着，如果既传入了事件名，又传入了回调函数，`cbs`也存在，那这就是第三种情况：如果同时提供了事件与回调，则只移除这个回调的监听器。那么我们只需遍历所有回调函数数组`cbs`，如果`cbs`中某一项与`fn`相同，或者某一项的`fn`属性与`fn`相同，那么就将其从数组中删除即可。如下：

```javascript
if (fn) {
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
        cb = cbs[i]
        if (cb === fn || cb.fn === fn) {
            cbs.splice(i, 1)
            break
        }
    }
}
```

以上，就是`$off`方法的内部原理。









## 4. vm.$once

### 4.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$once( event, callback )
```

- **参数**：

  - `{string} event`
  - `{Function} callback`

- **作用**：

  监听一个自定义事件，但是只触发一次。一旦触发之后，监听器就会被移除。

### 4.2 内部原理

该方法的作用是先订阅事件，但是该事件只能触发一次，也就是说当该事件被触发后会立即移除。要实现这个功能也不难，我们可以定义一个子函数，用这个子函数来替换原本订阅事件所对应的回调，也就是说当触发订阅事件时，其实执行的是这个子函数，然后再子函数内部先把该订阅移除，再执行原本的回调，以此来达到只触发一次的目的。

下面我们就来看下源码的实现。该方法的定义位于源码的`src/core/instance/event.js`中，如下：

```javascript
Vue.prototype.$once = function (event, fn) {
    const vm: Component = this
    function on () {
        vm.$off(event, on)
        fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
}
```

可以看到，在上述代码中，被监听的事件是`event`，其原本对应的回调是`fn`，然后定义了一个子函数`on`。

在该函数内部，先通过`$on`方法订阅事件，同时所使用的回调函数并不是原本的`fn`而是子函数`on`，如下：

```javascript
vm.$on(event, on)
```

也就是说，当事件`event`被触发时，会执行子函数`on`。

然后在子函数内部先通过`$off`方法移除订阅的事件，这样确保该事件不会被再次触发，接着执行原本的回调`fn`，如下：

```javascript
function on () {
    vm.$off(event, on)
    fn.apply(vm, arguments)
}
```

另外，还有一行代码`on.fn = fn`是干什么的呢？

上文我们说了，我们用子函数`on`替换了原本的订阅事件所对应的回调`fn`，那么在事件中心`_events`属性中存储的该事件名就会变成如下这个样子：

```javascript
vm._events = {
    'xxx':[on]
}
```

但是用户自己却不知道传入的`fn`被替换了，当用户在触发该事件之前想调用`$off`方法移除该事件时：

```javascript
vm.$off('xxx',fn)
```

此时就会出现问题，因为在`_events`属性中的事件名`xxx`对应的回调函数列表中没有`fn`，那么就会移除失败。这就让用户费解了，用户明明给`xxx`事件传入的回调函数是`fn`，现在反而找不到`fn`导致事件移除不了了。

所以，为了解决这一问题，我们需要给`on`上绑定一个`fn`属性，属性值为用户传入的回调`fn`，这样在使用`$off`移除事件的时候，`$off`内部会判断如果回调函数列表中某一项的`fn`属性与`fn`相同时，就可以成功移除事件了。

以上，就是`$once`方法的内部原理。
