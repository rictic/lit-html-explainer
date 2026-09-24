# Narration: What the browser does for Lit

Episode 2. Same syntax as script/narration.md: `## <scene>` starts a scene,
blank lines separate paragraphs (one text-to-speech call each), `{name}`
marks the start of the next word, `{pause 1.5}` adds silence. Names are
spelled the way they're said ("lit HTML"); captions map them back.

## intro

In the last video, we followed one template through lit HTML. {recap}At almost every step, the hard work was done by the browser: {parse}parsing, {clone}copying, {walk}walking the DOM.

{size}That's a big part of why lit HTML is small: about three kilobytes, compressed. {lit}All of Lit, with its component base class, is about six. {tour}This video is a tour of the platform features underneath it, and what each one does for Lit.

{pause 1.2}

## tagged

{js}It starts in JavaScript. {engine}When the engine parses a tagged template literal, it has already split the fixed strings from the expressions. {spec}And the language spec makes a promise about those strings: {once}each template literal in your code gets exactly one strings array. {frozen}It's created once, it's frozen, {same}and the same array is passed every time that literal runs.

{key}That array is lit HTML's cache key, for free. {nobuild}It's also why Lit doesn't need a build step: {already}the engine has already separated what never changes from what does.

{raw}The array has one more feature: a raw property, with the strings exactly as written. {trust}Before lit HTML treats the strings as trusted HTML, it checks that raw is there. {json}An object that came from JSON can't have it, so data can't pose as a template.

{values}And values are never parsed as HTML. {text}Text goes into text nodes, {attrs}and attributes go through set attribute. {safe}So a user's string can't turn into markup, unless you ask for that on purpose, with unsafe HTML.

## parser

{html}Next, HTML. {noparser}lit HTML doesn't parse HTML itself. {inner}It builds one string, and sets it as a template element's inner HTML. {native}The browser's parser is native code, it's fast, {irregular}and it follows the spec exactly, including all the irregular ways real pages write HTML.

{inert}What comes out is inert. {document}A template's contents belong to a separate document, with no browsing context. {scripts}So scripts don't run, {images}images don't load, {elements}and custom elements don't upgrade.

{markers}And those question mark markers? {comment}For years, the parser turned anything starting with angle bracket, question mark, into a comment. {news}But this year, HTML gained real processing instructions, as part of streaming content into place. {pi}Now, in the spec and in Chrome, angle bracket, question mark, marker, becomes a processing instruction node.

{still}lit HTML's markers still come out as comments. {dollar}A processing instruction's name can only use letters, digits, hyphens and underscores. {invalid}When the parser meets the first dollar sign, the name is invalid, {fallback}and the spec says to turn what it has read into a comment, starting with the question mark. {exact}That's exactly the comment lit HTML looks for.

## clone

{import}To stamp out a template, lit HTML calls import node on its contents, with deep set to true. {copy}That's the DOM's own copy operation. {noparse}Nothing is parsed again, {owned}and the copies belong to the page's document.

{walker}To find its places in the copy, it uses a tree walker. {onewalker}There's just one, created when lit HTML loads, {filter}with a filter that shows only elements and comments. {bits}That filter is a bit mask: one bit for elements, and the bit worth one hundred and twenty eight, for comments. {skips}The walker skips every text node in native code.

{anchors}And comments make good anchors. {anywhere}They can sit anywhere content can, {kept}the parser keeps them, {invisible}and they never render. {insert}A child part's content lives right after its comment, and new nodes go in with insert before.

## events

{listener}Event bindings use a feature of add event listener that's easy to miss. {object}The listener doesn't have to be a function. {handle}It can be any object with a handle event method. {part}lit HTML's event part registers itself, {calls}and calls whichever function it holds right now. {free}So a new arrow function on every render never touches the listener list.

{options}The same call takes an options argument, {pass}and lit HTML passes your listener there too. {props}So you can set capture, once, or passive as properties of the listener, right in the template.

## components

{lit}So far, that's all lit HTML. {adds}Lit adds components, {platform}and those are the platform too.

{custom}Custom elements. {define}Define a class for a tag name, {callbacks}and the browser calls it back when an element is created, connected, or when an attribute it watches changes. {reactive}Lit's reactive element turns those callbacks into reactive properties.

{shadow}Shadow DOM. {root}Each element renders into its own shadow root, {scoped}so its internal DOM and its styles are scoped to it, {slots}with slots for the children you pass in. {norewrite}There's no class name rewriting, and no global stylesheet to manage.

{sheets}Constructable stylesheets. {css}Styles written with Lit's css tag become one CSS style sheet object, {adopted}shared by every instance, through adopted style sheets. {thousand}A thousand instances, one parsed stylesheet. {sametrick}And a css literal with no expressions in it caches its sheet with the same trick as html: {cachekey}the strings array is the key.

## batching

{timing}Last, timing. {three}Set three properties on a Lit element, one after another, {once}and it renders once.

{request}Each change calls request update, {record}which records the change, {pending}and if no update is pending, starts one. {await}That update begins by awaiting a promise, {rest}which lets the rest of your code run first. {then}Then it renders once, with all three changes.

{microtask}Code after an await runs in a microtask, {paint}which runs before the browser gets a chance to paint. {half}So nobody ever sees a half-updated element. {complete}And update complete is that same promise, so your tests can await it.

## recap

{all}So here's what the browser does for Lit.

{r1}JavaScript's tagged templates split static from dynamic, and hand over a cache key. {r2}The HTML parser and the template element turn strings into inert DOM. {r3}Import node and the tree walker copy it and find the holes. {r4}Comments hold places. {r5}Listener objects make swapping handlers cheap. {r6}Custom elements, shadow DOM and adopted style sheets give you components with scoped styles. {r7}And microtasks batch the updates.

{glue}Much of Lit's own code is the glue between these features. {why}That's why it's small, {fast}and why so much of its speed is native code that's already in your browser.

## outro

{explorer}To watch this happen to your own templates, try the lit HTML explorer. {links}Links to the specs and the source are on the page with this video.

{pause 3}
