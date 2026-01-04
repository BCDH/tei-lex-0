<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:lex0="urn:tei-lex0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    exclude-result-prefixes="xs lex0 tei"
    version="3.0">

    <!--
        Split logic overrides for TEI HTML:
        - apply splitLevel only inside div[@xml:id=$splitOnlyID]
        - outside, use splitLevelNonSpec
    -->

    <xsl:function name="lex0:effectiveSplitLevel" as="xs:integer">
        <xsl:param name="node" as="node()"/>
        <xsl:sequence
            select="if ($node/ancestor-or-self::tei:div[@xml:id = $splitOnlyID])
                    then xs:integer($splitLevel)
                    else xs:integer($splitLevelNonSpec)"/>
    </xsl:function>

    <xsl:template match="tei:div | tei:div1 | tei:div2 | tei:div3 | tei:div4 | tei:div5 | tei:div6">
        <xsl:variable name="depth">
            <xsl:apply-templates mode="depth" select="."/>
        </xsl:variable>
        <xsl:variable name="effectiveSplitLevel" select="lex0:effectiveSplitLevel(.)"/>
        <xsl:choose>
            <xsl:when test="tei:keepDivOnPage(.) or number($depth) &gt; number($effectiveSplitLevel)">
                <xsl:call-template name="makeDivBody">
                    <xsl:with-param name="depth" select="$depth"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$depth = $effectiveSplitLevel and $STDOUT = 'true'"/>
            <xsl:when
                test="number($depth) &lt;= number($effectiveSplitLevel) and ancestor::tei:front and $splitFrontmatter = 'true'">
                <xsl:call-template name="makeDivPage">
                    <xsl:with-param name="depth" select="$depth"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when
                test="number($depth) &lt;= number($effectiveSplitLevel) and ancestor::tei:back and $splitBackmatter = 'true'">
                <xsl:call-template name="makeDivPage">
                    <xsl:with-param name="depth" select="$depth"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when
                test="number($depth) &lt;= number($effectiveSplitLevel) and ancestor::tei:body">
                <xsl:call-template name="makeDivPage">
                    <xsl:with-param name="depth" select="$depth"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="makeDivBody">
                    <xsl:with-param name="depth" select="$depth"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="*" mode="generateLink">
        <xsl:variable name="ident">
            <xsl:apply-templates mode="ident" select="."/>
        </xsl:variable>
        <xsl:variable name="depth">
            <xsl:apply-templates mode="depth" select="."/>
        </xsl:variable>
        <xsl:variable name="keep" select="tei:keepDivOnPage(.)"/>
        <xsl:variable name="effectiveSplitLevel" select="lex0:effectiveSplitLevel(.)"/>
        <xsl:variable name="LINK">
            <xsl:choose>
                <xsl:when test="$filePerPage='true'">
                    <xsl:choose>
                        <xsl:when test="preceding::tei:pb">
                            <xsl:apply-templates select="preceding::tei:pb[1]" mode="ident"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text>index</xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:value-of select="$standardSuffix"/>
                </xsl:when>
                <xsl:when test="ancestor::tei:elementSpec and not($STDOUT='true')">
                    <xsl:sequence select="concat('ref-',ancestor::tei:elementSpec/@ident,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="ancestor::tei:classSpec and not($STDOUT='true')">
                    <xsl:sequence select="concat('ref-',ancestor::tei:classSpec/@ident,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="ancestor::tei:dataSpec and not($STDOUT='true')">
                    <xsl:sequence select="concat('ref-',ancestor::tei:dataSpec/@ident,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="ancestor::tei:macroSpec and not($STDOUT='true')">
                    <xsl:sequence select="concat('ref-',ancestor::tei:macroSpec/@ident,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="not ($STDOUT='true') and ancestor::tei:back and not($splitBackmatter='true')">
                    <xsl:value-of select="concat($masterFile,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="not($STDOUT='true') and ancestor::tei:front and not($splitFrontmatter='true')">
                    <xsl:value-of select="concat($masterFile,$standardSuffix,'#',$ident)"/>
                </xsl:when>
                <xsl:when test="not($keep) and $STDOUT='true' and number($depth) &lt;= number($effectiveSplitLevel)">
                    <xsl:sequence select="concat($masterFile,$standardSuffix,$urlChunkPrefix,$ident)"/>
                </xsl:when>
                <xsl:when test="self::tei:text and $effectiveSplitLevel=0">
                    <xsl:value-of select="concat($ident,$standardSuffix)"/>
                </xsl:when>
                <xsl:when test="number($effectiveSplitLevel)= -1 and ancestor::tei:teiCorpus">
                    <xsl:value-of select="$masterFile"/>
                    <xsl:call-template name="addCorpusID"/>
                    <xsl:value-of select="$standardSuffix"/>
                    <xsl:value-of select="concat('#',$ident)"/>
                </xsl:when>
                <xsl:when test="number($effectiveSplitLevel)= -1">
                    <xsl:value-of select="concat('#',$ident)"/>
                </xsl:when>
                <xsl:when test="number($depth) &lt;= number($effectiveSplitLevel) and not($keep)">
                    <xsl:value-of select="concat($ident,$standardSuffix)"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:variable name="parent">
                        <xsl:call-template name="locateParentDiv"/>
                    </xsl:variable>
                    <xsl:choose>
                        <xsl:when test="$STDOUT='true'">
                            <xsl:sequence select="concat($masterFile,$urlChunkPrefix,$parent,'#',$ident)"/>
                        </xsl:when>
                        <xsl:when test="ancestor::tei:group">
                            <xsl:sequence select="concat($parent,$standardSuffix,'#',$ident)"/>
                        </xsl:when>
                        <xsl:when test="ancestor::tei:floatingText">
                            <xsl:sequence select="concat($parent,$standardSuffix,'#',$ident)"/>
                        </xsl:when>
                        <xsl:when test="$keep and number($depth=0)">
                            <xsl:sequence select="concat('#',$ident)"/>
                        </xsl:when>
                        <xsl:when test="$keep">
                            <xsl:sequence select="concat($masterFile,$standardSuffix,'#',$ident)"/>
                        </xsl:when>
                        <xsl:when test="ancestor::tei:div and tei:keepDivOnPage(ancestor::tei:div[last()])">
                            <xsl:sequence select="concat('#',$ident)"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:sequence select="concat($parent,$standardSuffix,'#',$ident)"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:value-of select="$LINK"/>
    </xsl:template>

    <xsl:template name="locateParentDiv">
        <xsl:variable name="effectiveSplitLevel" select="lex0:effectiveSplitLevel(.)"/>
        <xsl:choose>
            <xsl:when test="ancestor-or-self::tei:body/parent::tei:text/ancestor::tei:group">
                <xsl:apply-templates mode="ident" select="ancestor::tei:text[1]"/>
            </xsl:when>
            <xsl:when test="ancestor-or-self::tei:front/parent::tei:text/ancestor::tei:group">
                <xsl:apply-templates mode="ident" select="ancestor::tei:text[1]"/>
            </xsl:when>
            <xsl:when test="ancestor-or-self::tei:back/parent::tei:text/ancestor::tei:group">
                <xsl:apply-templates mode="ident" select="ancestor::tei:text[1]"/>
            </xsl:when>
            <xsl:when test="ancestor-or-self::tei:div and number($effectiveSplitLevel) &lt; 0">
                <xsl:apply-templates mode="ident" select="ancestor::tei:div[last()]"/>
            </xsl:when>
            <xsl:when test="ancestor-or-self::tei:div">
                <xsl:variable name="ancestors" select="count(ancestor-or-self::tei:div)"/>
                <xsl:variable name="diff" select="$ancestors - number($effectiveSplitLevel)"/>
                <xsl:variable name="what" select="if ($diff &lt;= 1) then 1 else $diff "/>
                <xsl:apply-templates mode="ident" select="ancestor-or-self::tei:div[$what]"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="ancestors" select="count(ancestor::tei:*[local-name()='div1'
                    or local-name()='div2'
                    or local-name()='div3'
                    or local-name()='div4'
                    or local-name()='div5'
                    or local-name()='div6'])"/>
                <xsl:variable name="what"
                    select="if ($ancestors &lt; number($effectiveSplitLevel)) then 1 else $ancestors - number($effectiveSplitLevel) +1"/>
                <xsl:apply-templates mode="ident"
                    select="ancestor-or-self::tei:*[local-name()='div1'
                    or local-name()='div2'
                    or local-name()='div3'
                    or local-name()='div4'
                    or local-name()='div5'
                    or local-name()='div6'][$what]"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="tei:head">
        <xsl:variable name="parentName" select="local-name(..)"/>
        <xsl:variable name="depth">
            <xsl:apply-templates mode="depth" select=".."/>
        </xsl:variable>
        <xsl:variable name="effectiveSplitLevel" select="lex0:effectiveSplitLevel(..)"/>
        <xsl:choose>
            <xsl:when test="parent::tei:group or parent::tei:body or parent::tei:front or parent::tei:back">
                <xsl:call-template name="splitHTMLBlocks">
                    <xsl:with-param name="element">h1</xsl:with-param>
                    <xsl:with-param name="content">
                        <xsl:apply-templates/>
                    </xsl:with-param>
                    <xsl:with-param name="copyid">false</xsl:with-param>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="parent::tei:argument">
                <div>
                    <xsl:call-template name="makeRendition">
                        <xsl:with-param name="default">false</xsl:with-param>
                    </xsl:call-template>
                    <xsl:apply-templates/>
                </div>
            </xsl:when>
            <xsl:when test="not(starts-with($parentName,'div'))">
                <xsl:apply-templates/>
            </xsl:when>
            <xsl:when test="not(preceding-sibling::tei:head)
                and starts-with($parentName,'div')
                and (tei:keepDivOnPage(..) or number($depth) &gt; number($effectiveSplitLevel))">
                <xsl:variable name="Heading">
                    <xsl:for-each select="..">
                        <xsl:call-template name="splitHTMLBlocks">
                            <xsl:with-param name="element"
                                select="if (number($depth)+$divOffset &gt; 6) then 'div'
                                else concat('h',number($depth)+$divOffset)"/>
                            <xsl:with-param name="content">
                                <xsl:call-template name="sectionHeadHook"/>
                                <xsl:call-template name="header">
                                    <xsl:with-param name="display">full</xsl:with-param>
                                </xsl:call-template>
                            </xsl:with-param>
                            <xsl:with-param name="copyid">false</xsl:with-param>
                        </xsl:call-template>
                    </xsl:for-each>
                </xsl:variable>
                <xsl:choose>
                    <xsl:when test="$outputTarget=('html5', 'html') and number($depth) &lt; 1">
                        <header>
                            <xsl:copy-of select="$Heading"/>
                        </header>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:copy-of select="$Heading"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
