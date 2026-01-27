<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:math="http://www.w3.org/2005/xpath-functions/math"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:lex0="urn:tei-lex0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    exclude-result-prefixes="tei xs math lex0"
    version="3.0">
    
    <xsl:param name="cssSecondaryFile" select="'css/tei.lex0.web.css'"/>
    <xsl:param name="cssFile"
    select="'https://unpkg.com/purecss@2.0.3/build/pure-min.css'"/> 
    <xsl:param name="institution" select="'DARIAH Working Group on Lexical Resources'"/>
    
    <xsl:template name="stdfooter"/>
    
    <!--TODO: I've moved some params to xproc, some are here, I will
    consolidate them all here.-->
    
    <!--<xsl:param name="cssFile" select="'https://www.tei-c.org/release/xml/tei/stylesheet/tei.css'"/>-->
    <!--<xsl:param name="pageLayout">Complex</xsl:param>
    
    <xsl:param name="headInXref">false</xsl:param>
    <xsl:param name="contentStructure" select="'all'"/>
    <xsl:param name="verbose" select="'true'"/>
    <xsl:param name="minimalCrossRef">true</xsl:param>-->
    <xsl:param name="forceWrap">false</xsl:param>
    <!-- with forceWrap false wrapLength plays no role -->
    <!-- <xsl:param name="wrapLength">80</xsl:param> -->
    <xsl:param name="attLength">1200</xsl:param>
    <!-- Only apply splitLevel inside this div; other divs use splitLevelNonSpec. -->
    <xsl:param name="splitOnlyID" select="'specification'"/>
    <xsl:param name="splitLevelNonSpec" select="'0'"/>
    <xsl:param name="outputMethod" select="'html'"/>
    <xsl:param name="tocFront" select="'false'"/>
    <xsl:param name="divOffset" select="2"></xsl:param>
    <xsl:variable name="version" select="//tei:fileDesc/tei:editionStmt/tei:edition/@n"/>
    <xsl:import href="https://www.tei-c.org/release/xml/tei/stylesheet/html/html.xsl"/>
    <xsl:import href="includes/layout.xsl"/>
    <xsl:import href="includes/pageHeader.xsl"/>
    <xsl:import href="includes/toc.xsl"/>
    <xsl:import href="includes/examples.xsl"/>
    <xsl:import href="includes/eg.xsl"/>
    <xsl:import href="includes/references.xsl"/>
    <xsl:import href="includes/lex0-split.xsl"/>
    <xsl:import href="includes/graphic.xsl"/> 
    
    <xsl:template name="bodyEndHook">
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.2.1-rc2/lazysizes.min.js"/>
        <script type="text/javascript" src="js/teilex0.js"/>
        <script type="text/javascript" src="js/ui.js"/>     
        <script type="text/javascript" src="js/prism.js"/>
        <script type="text/javascript" src="js/prism-xpath.js"/>
        <script type="text/javascript" src="js/prism-rnc.js"/>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@docsearch/js@3.9.0/dist/umd/index.js"/>
        <script type="text/javascript" src="js/algo.js"/>             
    </xsl:template>
    
    <xsl:template name="headHook">
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
    </xsl:template>
 
    <xsl:template match="tei:label[@rend = 'exampleSource']">
        <xsl:variable name="value" select="normalize-space(string-join(.//text(), ''))"/>
        <xsl:element name="button" namespace="http://www.w3.org/1999/xhtml">
            <xsl:attribute name="type">button</xsl:attribute>
            <xsl:attribute name="class">button-xsmall pure-button</xsl:attribute>
            <xsl:attribute name="title">
                <xsl:choose>
                    <xsl:when test="$value = 'P5'">This example comes from TEI P5 and may not necessarily represent the official TEI Lex-0 recommendation.</xsl:when>
                    <xsl:when test="$value = 'Lex-0'">This is a TEI Lex-0 example.</xsl:when>
                    <xsl:otherwise/>
                </xsl:choose>
            </xsl:attribute>
            <xsl:value-of select="$value"/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="tei:label">
        <xsl:element name="span" namespace="http://www.w3.org/1999/xhtml">
            <xsl:attribute name="class">button-xsmall pure-button</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <!--
      Woven ODD "Used by" / "Members" lists often emit adjacent <ref> nodes with no
      separating whitespace, which becomes squished links in HTML (e.g. ...</a><a...).
      Add a literal space between consecutive link_odd_* refs, and after bracketed
      member groups (showmembers2/3) when followed by another link.
    -->
    <xsl:template match="tei:ref[starts-with(normalize-space(@rend), 'link_odd_')]">
        <xsl:next-match/>
        <xsl:if test="following-sibling::*[1][self::tei:ref[starts-with(normalize-space(@rend), 'link_odd_')]]">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>

    <xsl:template match="tei:*[normalize-space(@rend) = ('showmembers2', 'showmembers3')]">
        <xsl:next-match/>
        <xsl:if test="following-sibling::*[1][self::tei:ref[starts-with(normalize-space(@rend), 'link_odd_')]]">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
