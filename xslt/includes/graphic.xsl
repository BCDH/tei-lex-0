<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:tei="http://www.tei-c.org/ns/1.0" xmlns:teix="http://www.tei-c.org/ns/Examples"
    xmlns:lex0="urn:tei-lex0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0" version="2.0"
    exclude-result-prefixes="tei teix lex0 xs">
    
    <xsl:function name="lex0:html-image-url" as="xs:string">
        <xsl:param name="url" as="xs:string?"/>
        <xsl:variable name="u" select="string($url)"/>
        <xsl:sequence
            select="
                if (starts-with($u, 'http://') or starts-with($u, 'https://') or starts-with($u, 'data:'))
                then $u
                else if (contains($u, 'assets/images/'))
                then concat('images/', substring-after($u, 'assets/images/'))
                else $u
            "/>
    </xsl:function>
    
   <xsl:template match="tei:head[parent::tei:figure]">
       <xsl:element name="div" namespace="http://www.w3.org/1999/xhtml">
          <xsl:if test="parent::tei:figure[@type='gallery']">
              <xsl:attribute name="class">
                  <xsl:value-of select="'caption pure-u-1-1'"/>
              </xsl:attribute>
          </xsl:if>
           <xsl:if test="parent::tei:figure[not(@type='gallery')]">
               <xsl:attribute name="class">
                   <xsl:value-of select="'caption'"/>
               </xsl:attribute>
           </xsl:if>
           <xsl:text>Figure </xsl:text>
           <xsl:number count="tei:head[parent::tei:figure]" level="any"/>
           <xsl:text>: </xsl:text>
           <xsl:apply-templates></xsl:apply-templates>
       </xsl:element>
   </xsl:template>
    
   
    <xsl:template match="tei:figure">
        <xsl:choose>
            <xsl:when test="@type='gallery'">
                <div class="pure-g gallery">
                    <xsl:if test="@xml:id">
                        <xsl:attribute name="id">
                            <xsl:value-of select="@xml:id"/>
                        </xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates></xsl:apply-templates>              
                </div>
            </xsl:when>
            <xsl:when test="@type='thumbnail'">
                <div class="thumbnail">
                    <xsl:if test="@xml:id">
                        <xsl:attribute name="id">
                            <xsl:value-of select="@xml:id"/>
                        </xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates></xsl:apply-templates>              
                </div>
            </xsl:when>
            <xsl:otherwise>
                <div class="figure">
                    <xsl:if test="@xml:id">
                        <xsl:attribute name="id">
                            <xsl:value-of select="@xml:id"/>
                        </xsl:attribute>
                    </xsl:if>
                <xsl:apply-templates></xsl:apply-templates>
                </div>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="tei:graphic[parent::tei:figure[@type='gallery']]">
        <div>
            <xsl:attribute name="class">
                <xsl:value-of select="concat(@rend, ' imgwrapper pure-img-responsive lazyload')"/>
            </xsl:attribute>
            <img class="pure-img-responsive lazyload">
                <xsl:attribute name="data-src">
                    <xsl:value-of select="lex0:html-image-url(@url)"/>
                </xsl:attribute>
                <xsl:if test="@height">
                    <xsl:attribute name="style">
                        <xsl:value-of select="concat('height: ', @height, ' !important;')"/>
                    </xsl:attribute>
                </xsl:if>
            </img>
        </div>
    </xsl:template>
    
    <xsl:template match="tei:graphic[parent::tei:figure[not(@type='gallery')]]">  
            <xsl:element name="img">
                <xsl:attribute name="class">
                    <xsl:value-of select="concat(@rend, ' pure-img-responsive lazyload')"/>
                </xsl:attribute>
                <xsl:attribute name="data-src">
                    <xsl:value-of select="lex0:html-image-url(@url)"/>
                </xsl:attribute>
                <xsl:if test="@height">
                    <xsl:attribute name="style">
                        <xsl:value-of select="concat('height: ', @height, ' !important;')"/>
                    </xsl:attribute>
                </xsl:if>
            </xsl:element>
    </xsl:template>
    
   
</xsl:stylesheet>
