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
    <xsl:param name="minimalCrossRef">true</xsl:param>
    <xsl:param name="forceWrap">false</xsl:param>
    <xsl:param name="wrapLength">75</xsl:param>
    <xsl:param name="attLength">80</xsl:param>
    <xsl:param name="splitLevel">2</xsl:param>-->
    <!-- Only apply splitLevel inside this div; other divs use splitLevelNonSpec. -->
    <xsl:param name="splitOnlyID" select="'specification'"/>
    <xsl:param name="splitLevelNonSpec" select="'0'"/>
    <xsl:param name="outputMethod" select="'html'"/>
    <xsl:param name="tocFront" select="'false'"/>
    
    <xsl:import href="https://www.tei-c.org/release/xml/tei/stylesheet/html/html.xsl"/>
    
    <xsl:variable name="version" select="//tei:fileDesc/tei:editionStmt/tei:edition/@n"/>
    
    <!--Starting without additional customizations or styling to get a clean look first-->
    
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
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/docsearch.js@2/dist/cdn/docsearch.min.js"/>
        <script type="text/javascript" src="js/algo.js"/>             
    </xsl:template>

   
</xsl:stylesheet>
