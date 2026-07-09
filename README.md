# Cloze - Obsidian Plugin

English | [简体中文](./README-CN.md)

Inspired from anki cards, this simple plugin for [Obsidian](https://obsidian.md/) enables you to create a cloze from special text segments (including highlighted, underlined, bolded texts and so on), as well as any selected text in reading mode.

Update: FYI, I just found that there is a fantastic plugin called [Spaced Repetition](https://www.stephenmwangi.com/obsidian-spaced-repetition/) that works just as an Obsidian version Anki, which also supports Cloze Cards. On the other hand, the Cloze plugin serves as more of a helper for reviewing pages/articles.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/demo.gif" width="500" />

## Use

### Basic

#### Auto Convert

By enabling the following settings, the corresponding text will also automatically be converted into clozes in reading mode.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/settings1.jpg" width="700" />

#### Custom Cloze

Select any text and right-click to open the Editor Menu. 

- Add error correction: Wrap selected text as an error-correction template using your configured symbols (Open + Delimiter + selected text + Close), then place the cursor right after Open so you can type the wrong text immediately.
- Remove error correction: Convert selected error-correction patterns back to plain correction text (e.g. `{error/correction}` -> `correction`).
- Create cloze: Quickly convert the selection into a cloze.
- Create cloze with hint: You will be prompted to input a hint for the cloze first.
- Remove cloze: Batch remove clozes from the selected text.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/editor-menu.png" width="400" />

Afterwards in the reading mode, you can toggle the visibility of a cloze area by just clicking it. If you want to toggle the visibility of all clozes, click on the ribbon icon --- the small fish.

<p>
<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/fish.png" width="300" />
<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/fish-mobile.png" width="280" />
</p>

### Other Features

#### Hover to reveal

By enabling "Hover to reveal" setting, when the mouse hovers over the cloze, the content will be revealed.

#### Cloze hint

Cloze hints are displayed as text within hidden cloze elements to serve as reminders.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/hint.png" width="300" />

There're mainly two options to give the cloze a hint by default.

- For auto converted cloze:
  
  You have the option to configure the cloze to display the hint by default, either showing the first letters or a specific percentage of the cloze content.

  <img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/setting-hint.jpg" width="700" />

- For custom cloze: 

  Create the cloze with "Create cloze with hint" or manually add `data-cloze-hint="your hint"` attribute to clozed `<span></span>`, e.g. `<span class="cloze-span" data-cloze-hint="your hint"></span>`

🔥 New feature: You can also right-click on the cloze to access a menu option bar, and then click on "More Hint" to dynamically reveal a portion of the cloze.

#### Error correction

By default, you can mark error-correction pairs with the syntax `{wrong text/correct text}`.

You can customize the error-correction syntax in plugin settings:

- Open symbol
- Delimiter (between wrong and correct text)
- Close symbol

When changed, both parsing in reading mode and the `Add error correction` editor action will use your custom pattern.

In reading mode, error corrections now support three states:

- Hidden: the wrong text looks like regular text (no underline).
- Marked: unresolved error-correction targets are shown with a dashed underline.
- Corrected: click an unresolved target to show `<del>wrong</del> <mark>correct</mark>`. Click it again to hide it back to Hidden.

How to trigger the global error-correction cycle for the current note in reading mode:

- Click the error-correction ribbon icon.
- Run the command `Toggle error correction hints`.
- Right-click an unresolved error-correction target and choose `Toggle error correction hints`.

Global cycle behavior:

1. First trigger: underline unresolved items only (Marked).
2. Second trigger: resolve all currently underlined unresolved items (Corrected).
3. Third trigger: reset all resolved items back to Hidden.

The ribbon tooltip changes to show the next action in the cycle, so users can see what the next click will do.

#### Fixed cloze width

You may enable 'Fixed cloze width' in the settings, which helps to ensure that the original text length is not revealed.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/setting-fixed-width.png" />

#### Activation

The plugin is active on all notes by default, but you can configure it to only activate on notes with a specific tag. Simply provide the desired tag in the 'Required tag' setting.

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/setting-tag.png" />

#### Customized Editor Menu

You can customize editor menu by enabling/disabling the following settings.

- Display add cloze button
- Display add cloze with hint button
- Display remove cloze button
- Display remove error correction button

<img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/setting-editor-menu.png" />

#### Customized styles

There are certain css variables that you may customize via css snippets.

| Variable  | Description  |
|---|---|
| --cloze-underline-color  | Cloze underline color  |
| --cloze-underline-width  | Cloze underline width  |
| --cloze-underline-style  | Cloze underline style  |
| --cloze-hint-color  | Cloze hint color  |
| --cloze-hint-font-size  | Cloze hint font size |
| --cloze-fixed-width  | Cloze fixed width (if fix-width enabled) |

Here is an example.

```css
body {
	--cloze-underline-color: pink;
	--cloze-underline-width: 2px;
	--cloze-underline-style: dashed;
	--cloze-hint-color: blue;
	--cloze-hint-font-size: 30px;
	--cloze-fixed-width: 50px;
}

```

### Best practices

- Enable Obsidian hotkey for "Add Cloze" could save you enough time for a cup of tea! <img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/hotkeys.png" width="700" /><img src="https://raw.githubusercontent.com/dearvikki/obsidian-cloze-plugin/main/assets/hotkeys2.png" width="700" />
- Cloze-mate: [Spaced Repetition #review flag](https://www.stephenmwangi.com/obsidian-spaced-repetition/notes/) is a best mate for reviewing pages.

## Q&As

### What's the visibility of the clozes when the page is exported to PDF?

Sadly, it can only be "all visibile" or "all hidden" for the present.

In **reading mode**, click the ribbon fish first, make sure that the page state is what you expect, and then click "export to PDF".

## Installation

This plugin is available in the Obsidian community plugin store. Look for **Cloze**.

To manually install, simply download the required files and put them in your plugins folder.
