---
title: 工作原理
---

## 1. 前言

通过上一篇用法回顾我们知道，过滤器有两种使用方式，分别是在双花括号插值中和在 v-bind 表达式中。但是无论是哪一种使用方式，过滤器都是写在模板里面的。既然是写在模板里面，那么它就会被编译，会被编译成渲染函数字符串，然后在挂载的时候会执行渲染函数，从而就会使过滤器生效。举个例子：

假如有如下过滤器：

```javascript
{{ message | capitalize }}

filters: {
    capitalize: function (value) {
        if (!value) return ''
        value = value.toString()
        return value.charAt(0).toUpperCase() + value.slice(1)
    }
}
```

那么它被编译成渲染函数字符串后，会变成这个样子：

```javascript
_f("capitalize")(message)
```

如果你是初次看到这个`_f`这样的函数，请不要惊慌。这跟我们在介绍模板编译篇中代码生成阶段时所看到的`_c`、`_e`函数一样，它都对应着一个函数，`_f`对应的是`resolveFilter`函数，通过模板编译会生成一个`_f`函数调用字符串，当执行渲染函数的时候，就会执行`_f`函数，从而让过滤器生效。

也就是说，真正让过滤器生效的是`_f`函数，即`resolveFilter`函数，所以接下来我们就分析一下`resolveFilter`函数的内部原理。

## 2. resolveFilter函数分析

`resolveFilter`函数的定义位于源码的`src/core/instance/render-helpers.js`中，如下：

```javascript
import { identity, resolveAsset } from 'core/util/index'

export function resolveFilter (id) {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
```

可以看到，`resolveFilter`函数内部只有一行代码，就是调用`resolveAsset`函数并获取其返回值，如果返回值不存在，则返回`identity`，而`identity`是一个返回同参数一样的值，如下：

```javascript
/**
 * Return same value
 */
export const identity = _ => _
```

显然，更令我们关心的是`resolveAsset`函数，该函数的定义位于源码的`src/core/util/options.js`中，如下：

```javascript
export function resolveAsset (options,type,id,warnMissing) {
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // 先从本地注册中查找
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // 再从原型链中查找
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
```

调用该函数时传入了4个参数，分别是当前实例的`$options`属性，`type`为`filters`，`id`为当前过滤器的`id`。

在该函数内部，首先判断传入的参数`id`（即当前过滤器的名称`id`）是否为字符串类型，如果不是，则直接退出程序。如下：

```javascript
if (typeof id !== 'string') {
    return
}
```

接着，获取到当前实例的`$options`属性中所有的过滤器，赋给变量`assets`，上篇文章中说过，定义过滤器有两种方式，一种是定义在组件的选项中，一种是使用`Vue.filter`定义。在之前的文章中我们说过，组件中的所有选项都会被合并到当前实例的`$options`属性中，并且使用`Vue.filter`定义的过滤器也会被添加到`$options`中的`filters`属性中，所以不管是以何种方式定义的过滤器，我们都可以从`$options`中的`filters`属性中获取到。如下：

```javascript
const assets = options[type]
```

获取到所有的过滤器后，接下来我们只需根据过滤器`id`取出对应的过滤器函数即可，如下：

```javascript
// 先从本地注册中查找
if (hasOwn(assets, id)) return assets[id]
const camelizedId = camelize(id)
if (hasOwn(assets, camelizedId)) return assets[camelizedId]
const PascalCaseId = capitalize(camelizedId)
if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
// 再从原型链中查找
const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
        'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
        options
    )
}
return res
```

上述代码中，根据过滤器`id`查找过滤器首先先从本地注册中查找，先通过`hasOwn`函数检查`assets`自身中是否存在，如果存在则直接返回；如果不存在，则将过滤器`id`转化成驼峰式后再次查找，如果存在则直接返回；如果也不存在，则将过滤器`id`转化成首字母大写后再次查找，如果存在则直接返回；如果还不存在，则再从原型链中查找，如果存在则直接返回；如果还不存在，则在非生产环境下抛出警告。

以上，就是`resolveFilter`函数的所有逻辑。可以看到，`resolveFilter`函数其实就是在根据过滤器`id`获取到用户定义的对应的过滤器函数并返回，拿到用户定义的过滤器函数之后，就可以调用该函数并传入参数使其生效了。如下图所示：
![](~@/filter/1.jpg)



## 3. 串联过滤器原理

上文分析了单个过滤器的工作原理，对于多个过滤器串联一起使用其原理也是相同的，还是先根据过滤器`id`获取到对应的过滤器函数，然后传入参数调用即可，唯一有所区别的是：对于多个串联过滤器，在调用过滤器函数传递参数时，后一个过滤器的输入参数是前一个过滤器的输出结果。举个例子：

假如有如下过滤器：

```javascript
{{ message | filterA | filterB }}

filters: {
    filterA: function (value) {
        // ...
    },
    filterB: function (value) {
        // ...
    },
}
```

那么它被编译成渲染函数字符串后，会变成这个样子：

![](~@/filter/2.jpg)


可以看到，过滤器`filterA`的执行结果作为参数传给了过滤器`filterB`。

## 4. 过滤器接收参数

上一篇文章中说了，过滤器本质上就是一个`JS`函数，既然是函数，那它肯定就可以接收参数，唯一一点需要注意的就是：过滤器的第一个参数永远是表达式的值，或者是前一个过滤器处理后的结果，后续其余的参数可以被用于过滤器内部的过滤规则中。举个例子：

假如有如下过滤器：

```javascript
{{ message | filterA | filterB(arg) }}

filters: {
    filterA: function (value) {
        // ...
    },
    filterB: function (value,arg) {
        return value + arg
    },
}
```

那么它被编译成渲染函数字符串后，会变成这个样子：

![](~@/filter/3.jpg)


可以看到，当过滤器接收其余参数时，它的参数都是从第二个参数开始往后传入的。

## 5. 小结

本篇文章介绍了过滤器的内部工作原理，就是将用户写在模板中的过滤器通过模板编译，编译成`_f`函数的调用字符串，之后在执行渲染函数的时候会执行`_f`函数，从而使过滤器生效。

所谓`_f`函数其实就是`resolveFilter`函数的别名，在`resolveFilter`函数内部是根据过滤器`id`从当前实例的`$options`中的`filters`属性中获取到对应的过滤器函数，在之后执行渲染函数的时候就会执行获取到的过滤器函数。

现在我们已经了解了过滤器的工作原理，那么`Vue`在模板编译的时候是如何识别出用户所写的过滤器并且解析出过滤器中的内容呢？下篇文章我们来介绍`Vue`如何解析过滤器。

