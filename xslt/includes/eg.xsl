<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    version="3.0">

    <xsl:template match="tei:eg">
        <xsl:variable name="myID">
            <xsl:apply-templates select="." mode="ident"/>
        </xsl:variable>
        <pre id="{$myID}">
            <xsl:attribute name="class">
                <xsl:text>pre_eg</xsl:text>
                <xsl:if test="not(*)">
                    <xsl:text> cdata</xsl:text>
                </xsl:if>
                <xsl:if test="@rend='eg_rnc'">
                    <xsl:text> language-rnc</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:choose>
                <xsl:when test="@rend='eg_rnc'">
                    <code class="language-rnc">
                        <xsl:apply-templates/>
                    </code>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates/>
                </xsl:otherwise>
            </xsl:choose>
            <a href="#{ $myID }" class="anchorlink">⚓</a>
        </pre>
    </xsl:template>

</xsl:stylesheet>
