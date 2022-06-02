---
title: 解析过滤器
---

## 1. 前言

在上篇文章中我们说了，无论用户是以什么方式使用过滤器，终归是将解析器写在模板中，既然是在模板中，那它肯定就会被解析编译，通过解析用户所写的模板，进而解析出用户所写的过滤器`message | filterA | filterB`中哪部分是被处理的表达式，哪部分是过滤器`id`及其参数。

还记得我们在介绍模板编译篇的解析阶段中说过，用户所写的模板会被三个解析器所解析，分别是`HTML`解析器`parseHTML`、文本解析器`parseText`和过滤器解析器`parseFilters`。其中`HTML`解析器是主线，在使用`HTML`解析器`parseHTML`函数解析模板中`HTML`标签的过程中，如果遇到文本信息，就会调用文本解析器`parseText`函数进行文本解析；如果遇到文本中包含过滤器，就会调用过滤器解析器`parseFilters`函数进行解析。在之前的文章中，我们只对`HTML`解析器`parseHTML`和文本解析器`parseText`其内部原理进行了分析，没有分析过滤器解析器`parseFilters`，那么本篇文章就来分析过滤器解析器的内部原理。



## 2. 在何处解析过滤器

我们一再强调，过滤器有两种使用方式，分别是**在双花括号插值中和在 v-bind 表达式中**，如下：

```javascript
<!-- 在双花括号中 -->
{{ message | capitalize }}

<!-- 在 `v-bind` 中 -->
<div v-bind:id="rawId | formatId"></div>
```

两种不同的使用方式唯一的区别是将过滤器写在不同的地方，既然有两种不同的地方可以书写过滤器，那解析的时候必然要在这两种不同地方都进行解析。

- 写在 v-bind 表达式中

  v-bind 表达式中的过滤器它属于存在于标签属性中，那么写在该处的过滤器就需要在处理标签属性时进行解析。我们知道，在`HTML`解析器`parseHTML`函数中负责处理标签属性的函数是`processAttrs`，所以会在`processAttrs`函数中调用过滤器解析器`parseFilters`函数对写在该处的过滤器进行解析，如下：

  ```javascript
  function processAttrs (el) {
      // 省略无关代码...
      if (bindRE.test(name)) { // v-bind
          // 省略无关代码...
          value = parseFilters(value)
          // 省略无关代码...
      }
      // 省略无关代码...
  }
  ```

- 写在双花括号中

  在双花括号中的过滤器它属于存在于标签文本中，那么写在该处的过滤器就需要在处理标签文本时进行解析。我们知道，在`HTML`解析器`parseHTML`函数中，当遇到文本信息时会调用`parseHTML`函数的`chars`钩子函数，在`chars`钩子函数内部又会调用文本解析器`parseText`函数对文本进行解析，而写在该处的过滤器它就是存在于文本中，所以会在文本解析器`parseText`函数中调用过滤器解析器`parseFilters`函数对写在该处的过滤器进行解析，如下：

  ```javascript
  export function parseText (text,delimiters){
      // 省略无关代码...
      const exp = parseFilters(match[1].trim())
      // 省略无关代码...
  }
  ```

现在我们已经知道了过滤器会在何处进行解析，那么接下来我们就来分析过滤器解析器`parseFilters`函数，来看看其内部是如何对过滤器进行解析的。

## 3. parseFilters函数分析

`parseFilters`函数的定义位于源码的`src/complier/parser/filter-parser.js`文件中，其代码如下：

```javascript
export function parseFilters (exp) {
  let inSingle = false                     // exp是否在 '' 中
  let inDouble = false                     // exp是否在 "" 中
  let inTemplateString = false             // exp是否在 `` 中
  let inRegex = false                      // exp是否在 \\ 中
  let curly = 0                            // 在exp中发现一个 { 则curly加1，发现一个 } 则curly减1，直到culy为0 说明 { ... }闭合
  let square = 0                           // 在exp中发现一个 [ 则curly加1，发现一个 ] 则curly减1，直到culy为0 说明 [ ... ]闭合
  let paren = 0                            // 在exp中发现一个 ( 则curly加1，发现一个 ) 则curly减1，直到culy为0 说明 ( ... )闭合
  let lastFilterIndex = 0
  let c, prev, i, expression, filters


  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break         // "
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
```

该函数的作用的是将传入的形如`'message | capitalize'`这样的过滤器字符串转化成`_f("capitalize")(message)`，接下来我们就来分析一下其内部逻辑。

在该函数内部，首先定义了一些变量，如下：

```javascript
let inSingle = false
let inDouble = false
let inTemplateString = false
let inRegex = false
let curly = 0
let square = 0
let paren = 0
let lastFilterIndex = 0
```



- inSingle：标志exp是否在 ' ... ' 中；
- inDouble：标志exp是否在 " ... " 中；
- inTemplateString：标志exp是否在 \` ... \` 中；
- inRegex：标志exp是否在 \\  ...  \ 中；
- curly = 0 :  在exp中发现一个 { 则curly加1，发现一个 } 则curly减1，直到culy为0 说明 { ... }闭合；
- square = 0：在exp中发现一个 [ 则curly加1，发现一个 ] 则curly减1，直到culy为0 说明 [ ... ]闭合；
- paren = 0：在exp中发现一个 ( 则curly加1，发现一个 ) 则curly减1，直到culy为0 说明 ( ... )闭合；
- lastFilterIndex = 0：解析游标，每循环过一个字符串游标加1；

接着，从头开始遍历传入的`exp`每一个字符，通过判断每一个字符是否是特殊字符（如`'`,`"`,`{`,`}`,`[`,`]`,`(`,`)`,`\`,`|`）进而判断出`exp`字符串中哪些部分是表达式，哪些部分是过滤器`id`，如下：

```javascript
for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
        if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
        if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
        if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
        if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
        c === 0x7C && // pipe
        exp.charCodeAt(i + 1) !== 0x7C &&
        exp.charCodeAt(i - 1) !== 0x7C &&
        !curly && !square && !paren
    ) {
        if (expression === undefined) {
            // first filter, end of expression
            lastFilterIndex = i + 1
            expression = exp.slice(0, i).trim()
        } else {
            pushFilter()
        }
    } else {
        switch (c) {
            case 0x22: inDouble = true; break         // "
            case 0x27: inSingle = true; break         // '
            case 0x60: inTemplateString = true; break // `
            case 0x28: paren++; break                 // (
            case 0x29: paren--; break                 // )
            case 0x5B: square++; break                // [
            case 0x5D: square--; break                // ]
            case 0x7B: curly++; break                 // {
            case 0x7D: curly--; break                 // }
        }
        if (c === 0x2f) { // /
            let j = i - 1
            let p
            // find first non-whitespace prev char
            for (; j >= 0; j--) {
                p = exp.charAt(j)
                if (p !== ' ') break
            }
            if (!p || !validDivisionCharRE.test(p)) {
                inRegex = true
            }
        }
    }
}

if (expression === undefined) {
    expression = exp.slice(0, i).trim()
} else if (lastFilterIndex !== 0) {
    pushFilter()
}

function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
}
```

可以看到，虽然代码稍微有些长，但是其逻辑非常简单。为了便于阅读，我们提供一个上述代码中所涉及到的`ASCII`码与字符的对应关系，如下：

```
0x22 ----- "
0x27 ----- '
0x28 ----- (
0x29 ----- )
0x2f ----- /
0x5C ----- \
0x5B ----- [
0x5D ----- ]
0x60 ----- `
0x7C ----- |
0x7B ----- {
0x7D ----- }
```

上述代码的逻辑就是将字符串`exp`的每一个字符都从前往后开始一个一个匹配，匹配出那些特殊字符，如`'`,`"`,\`，`{`,`}`,`[`,`]`,`(`,`)`,`\`,`|`。

如果匹配到`'`,`"`,\`字符，说明当前字符在字符串中，那么直到匹配到下一个同样的字符才结束，同时， 匹配 `()`, `{}`,` []` 这些需要两边相等闭合, 那么匹配到的 `|` 才被认为是过滤器中的`|`。

当匹配到过滤器中的`|`符时，那么`|`符前面的字符串就认为是待处理的表达式，将其存储在 `expression` 中，后面继续匹配，如果再次匹配到过滤器中的 `|`符 ,并且此时` expression`有值， 那么说明后面还有第二个过滤器，那么此时两个`|`符之间的字符串就是第一个过滤器的`id`，此时调用 `pushFilter`函数将第一个过滤器添加进`filters`数组中。举个例子：

假如有如下过滤器字符串：

```javascript
message | filter1 | filter2(arg)
```

那么它的匹配过程如下图所示：

![](~@/filter/4.jpg)


将上例中的过滤器字符串都匹配完毕后，会得到如下结果：

```javascript
expression = message
filters = ['filter1','filter2(arg)']
```



接下来遍历得到的`filters`数组，并将数组的每一个元素及`expression`传给`wrapFilter`函数，用来生成最终的`_f`函数调用字符串，如下：

```javascript
if (filters) {
    for (i = 0; i < filters.length; i++) {
        expression = wrapFilter(expression, filters[i])
    }
}

function wrapFilter (exp, filter) {
  const i = filter.indexOf('(')
  if (i < 0) {
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
```

可以看到， 在`wrapFilter`函数中，首先在解析得到的每个过滤器中查找是否有`(`，以此来判断过滤器中是否接收了参数，如果没有`(`，表示该过滤器没有接收参数，则直接构造`_f`函数调用字符串即`_f("filter1")(message)`并返回赋给`expression`，如下：

```javascript
const i = filter.indexOf('(')
if (i < 0) {
    return `_f("${filter}")(${exp})`
}
```

接着，将新的`experssion`与`filters`数组中下一个过滤器再调用`wrapFilter`函数,如果下一个过滤器有参数，那么先取出过滤器`id`，再取出其带有的参数，生成第二个过滤器的`_f`函数调用字符串，即`_f("filter2")(_f("filter1")(message),arg)`，如下：

```javascript
const name = filter.slice(0, i)
const args = filter.slice(i + 1)
return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
```



这样就最终生成了用户所写的过滤器的`_f`函数调用字符串。

## 4. 小结

本篇文章介绍了`Vue`是如何解析用户所写的过滤器的。

首先，我们介绍了两种不同写法的过滤器会在不同的地方进行解析，但是解析原理都是相同的，都是调用过滤器解析器`parseFilters`函数进行解析。

接着，我们分析了`parseFilters`函数的内部逻辑。该函数接收一个形如`'message | capitalize'`这样的过滤器字符串作为，最终将其转化成`_f("capitalize")(message)`输出。在`parseFilters`函数的内部是通过遍历传入的过滤器字符串每一个字符，根据每一个字符是否是一些特殊的字符从而作出不同的处理，最终，从传入的过滤器字符串中解析出待处理的表达式`expression`和所有的过滤器`filters`数组。

最后，将解析得到的`expression`和`filters`数组通过调用`wrapFilter`函数将其构造成`_f`函数调用字符串。
