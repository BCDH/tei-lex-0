<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0" xmlns:teix="http://www.tei-c.org/ns/Examples"
    xmlns:html="http://www.w3.org/1999/xhtml" xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    version="3.0" exclude-result-prefixes="tei teix html">

    <!--This is a bit of a hack to force the creation of xml:ids for each of the main sections
    in the specs. I need those because otherwise a complex layout with splitLevel set to 2 or 3
    will not be able to process individual elements etc.-->
    
    <!--In addition, this stylesheet imports introductions to the main sections in the specs.
    Because of the way odd is built, we can inject these only after the full odd has been
    compiled in the odd2lite step in our XProc pipeline.-->

    <xsl:template match="div[@xml:id = 'specification']">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">specification</xsl:attribute>
            <xsl:element name="head" namespace="http://www.tei-c.org/ns/1.0">Specification</xsl:element>
            <xsl:copy-of
                select="document('../tei/parts/intros/intro-to-specification.xml')/tei:TEI/tei:text/tei:body/node()"/>
            <xsl:apply-templates/>
        </xsl:element>
        
    </xsl:template>
    
    <xsl:template match="div[@xml:id = 'specification']/head"></xsl:template>

    <xsl:template match="div[@xml:id = 'specification']/div[1]">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">TEI.elements</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="div[@xml:id = 'specification']/div[2]">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">TEI.model-classes</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="div[@xml:id = 'specification']/div[3]">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">TEI.attribute-classes</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="div[@xml:id = 'specification']/div[4]">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">TEI.macros</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="div[@xml:id = 'specification']/div[5]">
        <xsl:element name="div" namespace="http://www.tei-c.org/ns/1.0">
            <xsl:attribute name="xml:id">TEI.datatypes</xsl:attribute>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="node() | @*">
        <xsl:copy>
            <xsl:apply-templates select="node() | @*"/>
        </xsl:copy>
    </xsl:template>

</xsl:stylesheet>
