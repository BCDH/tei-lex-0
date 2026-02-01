<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:tei="http://www.tei-c.org/ns/1.0"
                version="3.0">
    <xsl:output method="text" encoding="UTF-8" />

    <xsl:variable name="tei" select="/*" />
    <xsl:variable name="title"
                  select="normalize-space(($tei/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title[not(@type)][1],
                                             $tei/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title[1])[1])" />
    <xsl:variable name="version"
                  select="normalize-space($tei/tei:teiHeader/tei:fileDesc/tei:editionStmt/tei:edition/@n)" />
    <xsl:variable name="release-id"
                  select="if ($version) then concat('#v', $version) else ''" />

    <xsl:variable name="release-authors"
                  select="$tei/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:author
                          [if ($release-id) then some $t in tokenize(normalize-space(@corresp), '\s+') satisfies $t = $release-id else true()]" />

    <xsl:variable name="abstract"
                  select="normalize-space(string-join($tei/tei:teiHeader/tei:profileDesc/tei:abstract//text(), ' '))" />
    <xsl:variable name="keywords"
                  select="$tei/tei:teiHeader/tei:profileDesc/tei:textClass/tei:keywords//tei:item
                          | $tei/tei:teiHeader/tei:profileDesc/tei:textClass/tei:keywords//tei:term" />

    <xsl:template match="/">
        <xsl:text>cff-version: 1.2.0&#10;</xsl:text>
        <xsl:text>message: "If you use TEI Lex-0 in your research, software, or data production, please cite it using the information below."&#10;</xsl:text>
        <xsl:text>title: "</xsl:text>
        <xsl:value-of select="$title" />
        <xsl:text>"&#10;</xsl:text>
        <xsl:text>type: software&#10;</xsl:text>
        <xsl:text>authors:&#10;</xsl:text>
        <xsl:for-each select="$release-authors[@role = 'main']">
            <xsl:variable name="given"
                          select="normalize-space(string-join(tei:persName/tei:forename//text(), ' '))" />
            <xsl:variable name="family"
                          select="normalize-space(string-join(tei:persName/tei:surname//text(), ' '))" />
            <xsl:variable name="orcid"
                          select="normalize-space(tei:ident[@type='orcid'][1])" />
            <xsl:text>  - family-names: "</xsl:text>
            <xsl:value-of select="$family" />
            <xsl:text>"&#10;</xsl:text>
            <xsl:text>    given-names: "</xsl:text>
            <xsl:value-of select="$given" />
            <xsl:text>"&#10;</xsl:text>
            <xsl:if test="$orcid">
                <xsl:text>    orcid: "</xsl:text>
                <xsl:value-of select="$orcid" />
                <xsl:text>"&#10;</xsl:text>
            </xsl:if>
        </xsl:for-each>
        <xsl:for-each select="$release-authors[@role = 'contributing']">
            <xsl:sort select="upper-case(tei:persName/tei:surname)" />
            <xsl:variable name="given"
                          select="normalize-space(string-join(tei:persName/tei:forename//text(), ' '))" />
            <xsl:variable name="family"
                          select="normalize-space(string-join(tei:persName/tei:surname//text(), ' '))" />
            <xsl:variable name="orcid"
                          select="normalize-space(tei:ident[@type='orcid'][1])" />
            <xsl:text>  - family-names: "</xsl:text>
            <xsl:value-of select="$family" />
            <xsl:text>"&#10;</xsl:text>
            <xsl:text>    given-names: "</xsl:text>
            <xsl:value-of select="$given" />
            <xsl:text>"&#10;</xsl:text>
            <xsl:if test="$orcid">
                <xsl:text>    orcid: "</xsl:text>
                <xsl:value-of select="$orcid" />
                <xsl:text>"&#10;</xsl:text>
            </xsl:if>
        </xsl:for-each>
        <xsl:if test="$version">
            <xsl:text>version: </xsl:text>
            <xsl:value-of select="$version" />
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:text>repository-code: "https://github.com/BCDH/tei-lex-0"&#10;</xsl:text>
        <xsl:text>url: "</xsl:text>
        <xsl:value-of select="normalize-space($tei/tei:teiHeader/tei:fileDesc/tei:publicationStmt/tei:ptr/@target)" />
        <xsl:text>"&#10;</xsl:text>
        <xsl:text>license: "BSD-3-Clause"&#10;</xsl:text>
        <xsl:if test="$abstract">
            <xsl:text>abstract: |&#10;  </xsl:text>
            <xsl:value-of select="$abstract" />
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:if test="exists($keywords)">
            <xsl:text>keywords:&#10;</xsl:text>
            <xsl:for-each select="$keywords">
                <xsl:variable name="kw" select="normalize-space(string-join(.//text(), ' '))" />
                <xsl:if test="$kw">
                    <xsl:text>  - </xsl:text>
                    <xsl:value-of select="$kw" />
                    <xsl:text>&#10;</xsl:text>
                </xsl:if>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>
