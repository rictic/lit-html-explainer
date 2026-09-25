# Narration

The narration, and the source of truth for the voice track.

- `## <scene>` starts a scene. Scene ids are what video/src/scenes/*.js use.
- Blank lines separate paragraphs. Each paragraph is one text-to-speech call.
- `{name}` marks the start of the next word; `{name}` at the very end of a
  paragraph marks its end. Scenes look marks up as `<scene>.<name>`.
- A line `{pause 1.5}` adds that many seconds of silence after the previous
  paragraph (on top of the normal gap); before a scene's first paragraph, it
  delays the narration from the start of the scene.

Words are written the way they should be said (the code is on screen), so
"lit-html" is spelled "lit HTML": written with the hyphen, the voice sometimes
says "lit dot HTML".

## open

Here's a small app built with lit HTML. {app}A number, and a button that {click}adds one to it.

Open the browser's developer tools, {devtools}and you'll find a few things in the DOM that you didn't write. {empty}An empty comment. {marker}And a comment with a strange name: lit, and a long random number, between dollar signs.

{question}Where do they come from? {follow}Let's follow one template all the way through lit HTML, from the code you write, to the moment the number on the screen changes.

{pause 2.4}

## code

Here's the code. {fn}The counter function takes a number, and returns a template with three expressions in it: {b0}the span's class, {b1}the number itself, {b2}and a click handler.

{render}We render it once with zero. {handler}And each click renders it again, with the next number.

{phases}Inside lit HTML, rendering has three phases: {prepare}prepare, {create}create, {update}and update. {skip}Much of what makes lit HTML fast is how often it gets to skip the first two.

## literal

Let's start with the template itself. {tag}The word html, right before the backtick, makes this a tagged template literal. {split}When it runs, JavaScript splits it into two lists: {strings}the fixed strings of HTML, {values}and the values of the expressions in between. {call}Then it calls the html function, with both.

{result}And html does almost nothing with them. {object}It returns a plain object, holding the strings, the values, and a number that says this is HTML. {name}That object is called a template result. {nothing}Nothing has been parsed, and the DOM hasn't been touched.

{again}Now, call counter again, with one. {newvalues}The values are new. {same}But the strings array isn't. {identical}It's the very same object as before.

{rule}JavaScript makes one strings array for each template literal in your code, and passes that same array every time the literal runs. {key}So the array itself makes a perfect cache key. {meaning}Same strings array, same template.

## root

{render}Now we render. {lookup}First, render checks the container for a part it left there on an earlier render. {none}This is the first render, so there isn't one. {make}So it makes one: a child part, {comment}and it marks where that part begins with an empty comment. {first}That's the first mystery comment.

{childpart}A child part manages a spot in the DOM that can hold content: text, nodes, a list, or a whole template. {store}It's stored on the container, for next time, {hand}and then it's given our template result.

## lookup

{ask}The first thing the part does is look up the template. {cache}lit HTML keeps a cache of prepared templates, keyed by the strings array. {miss}This one has never been rendered, so it isn't there. {lazy}In fact, until this moment, lit HTML hasn't looked at this template's HTML at all. {prepare}Now it has to prepare it.

## markers

{goal}Preparing turns the strings into DOM. {parser}lit HTML doesn't include an HTML parser. It uses the browser's, which is fast, and handles every corner of HTML. {holes}But a parser needs complete HTML, and our strings have holes in them. {fill}So first, lit HTML fills each hole with a marker, one it can find again after parsing.

{which}Which marker to use depends on where the hole is. {scan}So lit HTML scans the strings, but it doesn't build anything. {states}It tracks just enough to know whether it's in text, inside a tag, or inside an attribute's value. {regex}A handful of regular expressions is all that takes.

{h0}The first hole is in the value of the class attribute. {value}lit HTML puts the marker in the value, {suffix}and adds dollar, lit, dollar, to the attribute's name. {why}That makes the binding easy to find later, and the browser never sees a real class attribute full of marker text.

{h1}The second hole is in text, inside the span. {pi}Here, the marker goes between angle brackets, after a question mark. {syntax}That's the syntax for a processing instruction, {bogus}but the parser turns this one into a comment. {short}It's a few bytes shorter than writing out a comment.

{h2}The third hole is the event binding. {attr}That's another attribute value, so it's handled just like the first.

{marker}The marker itself is the word lit, and a random number, between dollar signs. {once}The number is picked once, when the page loads, so it's very unlikely to appear in your templates by accident.

## parse

{joined}With the markers in, the strings join into one complete piece of HTML. {template}lit HTML creates a template element, {inner}and sets its inner HTML to that string. {parsed}The browser parses it into DOM.

{inert}The contents of a template element are inert. {scripts}Scripts don't run, {images}images don't load, {elements}and custom elements don't upgrade. {copied}It's DOM that's only there to be copied.

## walk

{walk}Next, lit HTML walks the new DOM once, counting nodes as it goes. {skip}It only visits elements and comments, {text}so text nodes, like all of this whitespace, aren't counted.

{n0}Node zero is the span, and it has a bound attribute. {found0}So lit HTML records a template part: an attribute part named class, at node zero. {remove0}Then it removes the attribute.

{n1}Node one is the marker comment. {found1}That's a child part, at node one. {keep1}The comment stays. It'll be needed later.

{n2}Node two is the button. {found2}Its bound attribute starts with an at sign, so it's an event part, for click. {prefixes}A dot would make it a property part, and a question mark, a boolean attribute part. {remove2}Recorded, and removed.

{done}Three holes, three template parts, {stop}so the walk can stop.

## cache

{template}The template element and its list of parts together make a Template, {stored}and it goes into the cache, under the strings array. {once}That's the prepare phase. {rule}It runs once for each template literal in your code, no matter how many times, or in how many places, you render it.

## create

{back}Back in the root part. {check}Is it already showing an instance of this template? {no}No, it's empty. {phase}So it's time for phase two: create.

{instance}lit HTML makes a template instance, {clone}and clones the template's content, with import node. {fast}That's fast. The browser copies the nodes without parsing anything.

{walk}Then it walks the copy, counting nodes the same way, {stop}and stops at each index in the parts list. {part}There, it creates a part: a small object that holds a direct reference to that node. {p0}An attribute part for the span. {p1}A child part that starts at the comment. {p2}And an event part for the button.

{never}From now on, lit HTML never has to search for these places again.

## update

{update}Now, phase three: update. {pairs}The instance gives each of its parts the matching value.

{v0}The attribute part gets an empty string. {was}Its last value was nothing, {change}so this is a change, and it sets the class attribute.

{v1}The child part gets zero. {text}It creates a text node, and inserts it right after its comment.

{v2}The event part gets the click handler. {add}It adds an event listener, {itself}but the listener it adds is itself. {calls}When a click comes in, the part calls whichever function it was given most recently.

{detached}All of this happens while the copy is still detached from the page. {insert}Then the root part inserts it, all at once, {remember}and remembers which instance it's showing.

{devtools}And there's the second mystery comment. {explain}It's the marker from the template, copied into the page, {starts}where it marks the start of the child part.

## rerender

{click}Now, click the button. {again}counter runs with one, and makes a new template result: {strings}the same strings array, {values}with new values.

{render}render finds the part it left on the body. {hit}The template is already in the cache, {inst}and the part is already showing an instance of it. {skip}So prepare and create are both skipped. {straight}Straight to update.

{a}The class changed, from empty to odd. {set}That's one call to set attribute. {b}The number changed too, {textnode}but lit HTML doesn't make a new text node. {data}It changes the text of the one it made last time. {c}And the click handler is a new function, {keep}so the part just keeps it. {listener}The listener on the button stays the same.

{two}That's two small writes to the DOM. {rest}Nothing else in the template is touched, or even looked at. {samevalue}And when a string or a number hasn't changed, its part skips the DOM entirely.

## nesting

{nested}A child part can hold a whole template, too. {same}It handles one exactly the way the root part did: {lookup}it looks up the template, {create}creates an instance if it needs one, {update}and updates it.

{switch}If the part gets a different template than last time, {clear}it clears out what's there, and creates a new instance. {back}Switching back skips prepare, since that template is in the cache, {again}but it does create the instance again. {directive}If you switch back and forth a lot, the cache directive keeps both instances around.

## lists

{arrays}Give a child part an array, {items}and it makes a child part for each item, {pairs}each one marked by a pair of empty comments. {more}That's where the rest of the empty comments come from.

{one}Here, three list items come from one template literal. {prep}It's prepared once, {three}and each item gets its own instance.

{next}On the next render, items are matched up by position, {inplace}and each instance is updated in place. {repeat}To match items by a key instead, so their DOM moves when the list is reordered, use the repeat directive.

## recap

{trip}So that's the whole trip. {stack}Let's stack up the caching.

{l1}JavaScript gives each template literal one strings array. {l2}lit HTML uses that array as a key, so each template is scanned and parsed only once. {l3}Each child part remembers the instance it's showing, so DOM is only cloned when the template in that spot changes. {l4}And each part remembers its last value, so an unchanged string or number never touches the DOM.

{answer}And those comments? {empty}The empty ones are markers that lit HTML creates as it renders: for the root part, and for list items. {lit}The ones with lit and a number are the template's markers, copied into the page. {starts}Each one marks where a child part starts.

## outro

{read}For more detail, read Life of a lit HTML render, in the lit repository, {source}and the source, lit HTML dot T S. {file}It's well commented, and it's all in one file.

{pause 3}
