<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step xmlns:p="http://www.w3.org/ns/xproc"
                version="3.0"
                name="generateCitationCff">
    <p:load href="../odd/lex-0.odd"
            content-type="application/xml" />
    <p:xslt>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/teiheader-to-cff.xsl" />
        </p:with-input>
    </p:xslt>
    <p:store href="{resolve-uri('../CITATION.cff', static-base-uri())}"
             serialization="map{'method':'text','encoding':'UTF-8'}" />
</p:declare-step>
