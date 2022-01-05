TITLE: Syntax
INDEX: 1
UPDATED: 2022-01-05

# Navigation Links

You can easily insert navigation links anywhere as such:

+ Navigation
  | Hello World Quickstart: Read the Hello World guide. -> /guides/hello-world/quickstart/
  | Example Sub-Section One: First example sub-section. -> /guides/markdown-syntax/section-example/sub-section-one/
  | Example Sub-Section Two: Second example sub-section. -> /guides/markdown-syntax/section-example/sub-section-two/

---

# Text Samples

Sem integer vitae justo eget magna. Euismod lacinia at quis risus. Tellus cras adipiscing enim eu turpis egestas. Fringilla urna porttitor rhoncus dolor purus non. Commodo viverra maecenas accumsan lacus vel. **Feugiat in fermentum posuere urna nec tincidunt praesent semper feugiat**.

**Turpis egestas integer eget aliquet nibh.** Pharetra convallis posuere morbi leo urna molestie at. Metus aliquam eleifend mi in. Scelerisque varius morbi enim nunc faucibus a. Condimentum id venenatis a condimentum vitae sapien. Neque [ornare aenean](#) euismod elementum nisi quis. Lacus laoreet non curabitur gravida arcu ac tortor. Vestibulum lectus mauris ultrices eros in!

Leo urna molestie at _elementum_ eu **_facilisis_** sed, eg. `team:conversation:messages` Nam aliquam sem et tortor consequat id porta nibh.

Sagittis vitae et leo duis ut. **Suspendisse faucibus interdum** posuere lorem ipsum dolor sit amet. Nisl tincidunt eget nullam non nisi est sit amet. Urna nunc id cursus metus aliquam eleifend. 😀

Turpis massa tincidunt dui ut ornare lectus sit. Eget dolor morbi non arcu risus quis varius quam quisque. Maecenas sed enim ut sem viverra. Etiam tempor orci eu lobortis elementum nibh. **Tristique senectus et netus et malesuada fames.**

!!! Commodo viverra maecenas accumsan lacus vel! Eget egestas purus viverra accumsan in nisl nisi. Blandit aliquam etiam erat velit scelerisque in dictum non consectetur. Nam at lectus urna duis convallis. 😅

!! Mattis molestie a **iaculis at erat** pellentesque adipiscing. Posuere lorem ipsum dolor sit amet. Nec tincidunt praesent semper feugiat nibh sed. Vestibulum lorem sed risus ultricies tristique nulla aliquet enim.

! Id diam maecenas ultricies mi eget mauris pharetra et ultrices. Pretium lectus quam id leo in vitae. Posuere ac ut consequat semper viverra. Massa massa ultricies mi quis hendrerit. Nullam ac tortor vitae purus faucibus.

In tellus integer feugiat scelerisque varius morbi enim nunc:

> “Id diam maecenas ultricies mi eget mauris pharetra et ultrices. Pretium lectus quam id leo in vitae. Posuere ac ut consequat semper viverra. Massa massa ultricies mi quis hendrerit. Nullam ac tortor vitae purus faucibus.”
>
> Valerian.

---

# List Samples

Nunc lobortis mattis aliquam faucibus purus in massa. Risus feugiat in ante metus dictum at tempor. Felis eget velit aliquet sagittis id consectetur.

**Vestibulum lectus mauris ultrices eros in:**

* Access to buckets: `bucket:url`
* Access to availability information: `team:availability`
* Access to conversation initiate: `team:conversation:initiate`
* Access to conversation sessions: `team:conversation:sessions`
* Access to conversation messages: `team:conversation:messages`
* Access to a people profiles: `team:people:profiles`
* Access to a people conversations: `team:people:conversations`
* Access to a people events: `team:people:events`

**Vestibulum lectus mauris ultrices eros in:**

1. Access to buckets: `bucket:url`
2. Access to availability information: `team:availability`
3. Access to conversation initiate: `team:conversation:initiate`

---

# Code Sample

Inline code: `echo "hello world"`

Block code:

```javascript
var dump = {
  error : false
};

console.log("Hello World", dump);
```

---

# Video Embed Sample

YouTube videos can be included in Markdown, as such:

${youtube}[An Architect's Own House Situated on a Remote Beach](LildjJAG0fk)

---

# Full-Width Image Sample

Full-width images can be included as such:

![](image-caption.jpg)

---

# Caption Image Sample

Images can be included with a caption, as such:

$[Sample Mountain Image](![](image-caption.jpg))

---

# Table Sample

Est ullamcorper eget nulla facilisi etiam dignissim diam quis enim. **Sit amet dictum sit amet justo donec enim diam vulputate.**

Elit eget gravida cum sociis natoque penatibus et. Ut faucibus pulvinar elementum integer enim neque:

| Route Name | API Reference | Associated Scopes | Comments |
| --- | --- | --- | --- |
| Check If Conversation Exists | [Read reference](/references/rest-api/v1/) | `team:conversation:sessions` | — |
| Initiate Conversation With Session | [Read reference](/references/rest-api/v1/) | `team:conversation:initiate` | Write permission required |
| Send Message In Conversation | [Read reference](/references/rest-api/v1/) | `team:conversation:messages` | Write permission required |
| Assign Conversation Routing | [Read reference](/references/rest-api/v1/) | `team:conversation:routing` | Write permission required |
| List Conversation Pages | [Read reference](/references/rest-api/v1/) | `team:conversation:pages` | — |
| Get Conversation State | [Read reference](/references/rest-api/v1/) | `team:conversation:states` | — |
| Request Email Transcript | [Read reference](/references/rest-api/v1/) | `team:conversation:actions` | Write permission required |

Ac tortor vitae purus faucibus ornare suspendisse. Egestas sed tempus urna et pharetra. Euismod nisi porta lorem mollis aliquam ut porttitor! 👏

---

# Title Samples

## Level 2 Title

### Level 3 Title

#### Level 4 Title

##### Level 5 Title

###### Level 6 Title
