[31m这是红色文字3[0m 这是普通文字

啊啊啊啊啊单独的
Skip to content
Navigation Menu
drudru
ansi_up

请键入 / 去搜索

代码
议题
2
拉取请求
2
操作
项目
Wiki
安全
洞察
Owner avatar
ansi_up
公共
drudru/ansi_up
转到文件
t
文件名		
drudru
drudru
Bump version 6.0.6
07a4824
 · 
8 个月之前
examples
A workaround for Typescript UMD modules
9 年之前
test
Fixes #88 - broken handling of SGR 22 in 6.0.0
3 年之前
.gitignore
Initial commit
14 年之前
.notags
Bump version to 5.1.0
5 年之前
LICENSE
Update names
8 个月之前
Makefile
Converted AnsiUp to ESM / ES6 Module
3 年之前
Readme.md
Update names
8 个月之前
ansi_up.d.ts
Better naming
3 年之前
ansi_up.js
Bump version 6.0.6
8 个月之前
ansi_up.js.map
Converted AnsiUp to ESM / ES6 Module
3 年之前
ansi_up.ts
Bump version 6.0.6
8 个月之前
package-lock.json
Bump version 6.0.6
8 个月之前
package.json
Bump version 6.0.6
8 个月之前
sample.png
updated sample png
14 年之前
tsconfig.json
Converted AnsiUp to ESM / ES6 Module
3 年之前
umd.footer
Even better umd header.
9 年之前
umd.header
Update names
8 个月之前
Repository files navigation
自述文件
MIT 许可证
ansi_up.js
ansi_up is an easy to use library that transforms text containing ANSI color escape codes into HTML.

This module is a single ES6 Javascript file with no dependencies. It is "isomorphic" javascript. This is just another way of saying that the ansi_up.js file will work in both the browser or node.js. The js library is compiled from TypeScript and its type description ships with the NPM. This code has been used in production since 2011 and is actively maintained.

For example, turn this terminal output:

ESC[1;Foreground
�[1;30m 30  �[1;30m 30  �[1;30m 30  �[1;30m 30  �[1;30m 30  �[1;30m 30  �[1;30m 30  �[1;30m 30  �[0m
�[1;31m 31  �[1;31m 31  �[1;31m 31  �[1;31m 31  �[1;31m 31  �[1;31m 31  �[1;31m 31  �[1;31m 31  �[0m
�[1;32m 32  �[1;32m 32  �[1;32m 32  �[1;32m 32  �[1;32m 32  �[1;32m 32  �[1;32m 32  �[1;32m 32  �[0m
...
...into this browser output:



Browser Example
    <script type="module" type="text/javascript">

    var txt  = "\n\n\033[1;33;40m 33;40  \033[1;33;41m 33;41  \033[1;33;42m 33;42  \033[1;33;43m 33;43  \033[1;33;44m 33;44  \033[1;33;45m 33;45  \033[1;33;46m 33;46  \033[1m\033[0\n\n\033[1;33;42m >> Tests OK\n\n"

    import { AnsiUp } from './ansi_up.js'
    var ansi_up = new AnsiUp();

    var html = ansi_up.ansi_to_html(txt);

    var cdiv = document.getElementById("console");

    cdiv.innerHTML = html;

    </script>
Node Example
    import { AnsiUp } from './ansi_up.js'
    var ansi_up = new AnsiUp();

    var txt  = "\n\n\033[1;33;40m 33;40  \033[1;33;41m 33;41  \033[1;33;42m 33;42  \033[1;33;43m 33;43  \033[1;33;44m 33;44  \033[1;33;45m 33;45  \033[1;33;46m 33;46  \033[1m\033[0\n\n\033[1;33;42m >> Tests OK\n\n"

    var html = ansi_up.ansi_to_html(txt);
More examples are in the 'examples' directory in the repo.

Typescript Example
    import { AnsiUp } from './ansi_up.js'
    const ansi_up = new AnsiUp();

    const txt  = "\n\n\x1B[1;33;40m 33;40  \x1B[1;33;41m 33;41  \x1B[1;33;42m 33;42  \x1B[1;33;43m 33;43  \x1B[1;33;44m 33;44  \x1B[1;33;45m 33;45  \x1B[1;33;46m 33;46  \x1B[1m\x1B[0\n\n\x1B[1;33;42m >> Tests OK\n\n"

    let html = ansi_up.ansi_to_html(txt);
Installation
$ npm install ansi_up
Versions
Version 6.0 - Switch to ES6 module. Add faint styles. Style css configurable.
Version 5.1 - Add italic and underline styles (@DaoDaoNoCode)
Version 5.0 - Security fix for OSC URLs
Version 4.0 - Re-architect code to support terminal URL codes。
Version 3.0 - now treats ANSI bold sequences as CSS font-weight:bold
Version 2.0 - moved to a stateful, streaming version of the API
Version 1.3 - was the last of the older, deprecated API.
Quick Start
Use whatever module system to import the ansi_up module.
Instantiate the object.
For every piece of ansi escaped text string, call ansi_to_html。
Append the emitted HTML to the previous HTML already emitted.
DONE
API Methods and Recommended Settings
You only need the ansi_to_html method. The other properties listed below allow you to override some of the escaping behaviour. You probably don't need to change these from their default values.

It is recommended that the HTML container that holds the span tags is styled with a monospace font. A PRE tag would work just fine for this. It is also recommended that the HTML container is styled with a black background. See the examples, for more CSS theming.

ansi_to_html (txt)
This transforms ANSI terminal escape codes/sequences into SPAN tags that wrap and style the content.

This method only interprets ANSI SGR (Select Graphic Rendition) codes or escaped URL codes. For example, cursor movement codes are ignored and hidden from output.

This method also safely escapes any unsafe HTML characters.

The default style uses colors that are very close to the prescribed standard. The standard assumes that the text will have a black background. These colors are set as inline styles on the SPAN tags. Another option is to set the 'use_classes' property to true'. This will instead set classes on the spans so the colors can be set via CSS. The class names used are of the format ansi-*-fg/bg 和 ansi-bright-*-fg/bg where * is the colour name, i.e black/red/green/yellow/blue/magenta/cyan/white. See the examples directory for a complete CSS theme for these classes.

Properties
escape_html
(default: true)

By default, HTML's reserved characters & < > " ' are replaced with HTML entities to make them appear as literal characters in your application, rather than being interpreted as HTML structure. If you prefer keeping HTML's reserved characters untouched, you can set this to false.

use_classes
(default: false)

This causes the SPAN tags to use classes to style the SPAN tags instead of specified RGB values.

url_allowlist
(default: { 'http':1, 'https':1 })

This mapping is an 'allow' list of URI schemes that will be allowed to render HTML anchor tags.

boldStyle
(default: 'font-weight:bold')

faintStyle
(default: 'opacity:0.7')

italicStyle
(default: 'font-style:italic')

underlineStyle
(default: 'text-decoration:underline')

Buffering
In general, the ansi_to_html should emit HTML output when invoked with a non-empty string. The only exceptions are an incomplete ESC sequence or an incomplete OSC URL sequence. For those cases, the library will buffer (not emit output), until it receives input that completes those sequences.

Example of a Use Case
I have used this library to 'tail' a file.

On a remote machine, I had process generating a log file. I had a web server running on the same machine. The server hosted a simple HTML page that used AJAX to poll an object with a range query. Specifically I used an HTTP/1.1 GET request with RFC 7233 Range query. The first range query would start at 0, but then progressively move forward after new data was received.

For each new chunk of data received, I would transform the data with ansi_up, 和 append the new spans to the innerHTML of a PRE tag.

UTF8 note
One last important note, ansi_up takes its input in the form of a Javascript string. These strings are UTF8. When you take the output of some program and send it to Javascript, there will be buffering. Be sure that you do not send incomplete UTF8 sequences. Javascript will ignore or drop the sequence from the stream when it converts it to a string.

Building
To build, a simple Makefile handles it all.

    $ make
Running tests
To run the tests for ansi_up, run npm install to install dev dependencies. Then:

    $ make test
关于
A javascript library that converts text with ANSI terminal codes into colorful HTML Zero dependencies.

翻译
资源
 自述文件
许可证
 MIT 许可证
 活动
星标
 854 星标
Watchers
 10 关注
Forks
 104 复刻
举报仓库
发行版 20
v6.0.6
最新
2025年5月17日
+ 19 个发行版
软件包
未发布软件包
贡献者
21
@drudru
@marques-work
@fetus-hina
@jamesrwhite
@Taitava
@vidartf
@ketan
@mantoni
@sodabrew
@mikaraento
@eXtreme
@christian-bromann
@samccone
@stebunovd
+ 7 位贡献者
语言
JavaScript
66.2%
 
TypeScript
33.3%
 
Makefile
0.5%
Related repositories
No similar repositories found
Footer
© 2026 GitHub, Inc.
Footer navigation
服务条款
隐私
安全
状态
社区
文档
联系我们
管理 Cookies
请勿分享我的个人信息
 Octotree
 Login with GitHub
