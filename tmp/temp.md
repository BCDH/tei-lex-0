# Temp

@ludovicus-hispanicus I feel your pain :)

I also love definitions like *eine Art Pflanze* (or *herbae genus*). In one of our Serbian-German-Latin dictionaries, I used definitions like that to create a dictionary “slice” for extracting “difficult words,” i.e., words for which the dictionary author could not find direct translation equivalents: https://raskovnik.org/isecak/teske_reci/VSK.SR/0/1/e.

And many thanks for such a well-documented issue.

The prototypical use of `lbl` in Lex-0 would be something like this:

```xml
<xr type="synonymy">
  <lbl>Syn.</lbl>
  <ref type="entry">blablah</ref>
</xr>
```

This is what I would call *explicit labeling*: there is a clearly delimited string that is, crucially, structurally separate from the object being labeled. This works very well in cross-references.

“Bezeichnung einer Hexe” is different, because “Bezeichnung” is not, and cannot be, structurally (or syntactically) separate from the genitive “einer Hexe.” So is “Bezeichnung” a label? Not in that clear-cut, prototypical sense. But encoding is interpretation, and as the encoder you can make that judgment call. If a definition starts with something like “probably this or that,” I can absolutely see why one would treat that as a labeled definition. I would call this use *implicit labeling* because it differs from explicit label strings that are structurally detached from the definitional content.

In Lex-0, I would prefer to keep `lbl` for explicit labels and keep the content model of definitions as strict as possible. Definitions should remain coherent lexical prose rather than mixed structures that blur label and content boundaries.

So what does this mean for your dictionary?

1. Your current workaround, `<seg type="lbl" corresp="...">` inside `<def>`, is very good. You mention losing the semantic specificity of `lbl`, but I would argue that your workaround simply recognizes that an implicit label is, by nature, implicit.
2. If, however, your analysis of the dictionary and your editorial policy say that implicit labels are labels and should be marked up as such, you still have another option: insert *explicit, no-text labels* into the sense containing the definition.

If you do this:

```xml
<sense xml:id="qumqummatu_ahw_sense_general">
  <lbl corresp="ahw_abbreviations_taxonomy.xml#Bez"/>
  <def xml:lang="deu">Bezeichung einer Hexe</def>
</sense>
```

you get:

- a full, clean definition text, *and*
- an explicit label defined in your taxonomy.

But this label is an empty element with no text node, so it should not output text. It remains “invisible” in the definition text, while still being available for searching, faceting, etc.

You could even decide to transform it into something explicit for end users.

This gives you the best of both worlds: clear definitions and “invisible” labels that you can still use for searching, faceting, etc.

For grammatical labeling, we recommend using `<gram>`, as in:

```xml
<sense>
  <gramGrp>
    <gram type="number">pl. tant.</gram>
  </gramGrp>
  <def>eine Menge Hexen</def>
</sense>
```

See https://dev.lex-0.org/senses.html#senses.grammatical-properties.
