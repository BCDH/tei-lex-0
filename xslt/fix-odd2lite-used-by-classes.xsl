<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.tei-c.org/ns/1.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    version="2.0">

    <xsl:output method="xml" indent="no"/>

    <xsl:key name="class-attdef-by-datatype"
        match="div[@type='refdoc'][starts-with(@xml:id, 'TEI.att.')]//table[@rend='attDef']"
        use="for $r in .//ref[starts-with(@target, '#TEI.teidata.')] return substring-after($r/@target, '#')"/>

    <xsl:template match="node() | @*">
        <xsl:copy>
            <xsl:apply-templates select="node() | @*"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="div[@type='refdoc'][starts-with(@xml:id, 'TEI.teidata.')]/table/row[cell/hi[normalize-space() = 'Used by']]">
        <xsl:variable name="data-id" select="ancestor::div[@type='refdoc'][1]/@xml:id"/>
        <xsl:variable name="class-tables" select="key('class-attdef-by-datatype', $data-id)"/>
        <xsl:copy>
            <xsl:apply-templates select="@* | node()[not(self::cell[@rend='wovenodd-col2'])]"/>
            <xsl:for-each select="cell[@rend='wovenodd-col2']">
                <xsl:copy>
                    <xsl:apply-templates select="@* | node()"/>
                    <xsl:if test="$class-tables">
                        <ab rend="parent">
                            <seg xml:lang="en">Class: </seg>
                            <list>
                                <xsl:for-each-group select="$class-tables"
                                    group-by="concat(ancestor::div[@type='refdoc'][1]/@xml:id, '|', normalize-space(ancestor::row[1]/cell[@rend='odd_label'][1]))">
                                    <xsl:sort
                                        select="count(tokenize(substring-before(current-grouping-key(), '|'), '\\.'))"
                                        data-type="number"/>
                                    <xsl:sort select="substring-before(current-grouping-key(), '|')"/>
                                    <xsl:sort select="substring-after(current-grouping-key(), '|')"/>
                                    <xsl:variable name="class-id" select="substring-before(current-grouping-key(), '|')"/>
                                    <xsl:variable name="attr-name" select="substring-after(current-grouping-key(), '|')"/>
                                    <item>
                                        <ref target="#{$class-id}" rend="link_odd_classSpec">
                                            <xsl:value-of select="normalize-space(root(.)//div[@type='refdoc'][@xml:id = $class-id]/head[1])"/>
                                        </ref>/@<xsl:value-of select="$attr-name"/>
                                    </item>
                                </xsl:for-each-group>
                            </list>
                        </ab>
                    </xsl:if>
                </xsl:copy>
            </xsl:for-each>
        </xsl:copy>
    </xsl:template>
</xsl:stylesheet>
