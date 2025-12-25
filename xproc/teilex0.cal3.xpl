<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step xmlns:p="http://www.w3.org/ns/xproc" xmlns:c="http://www.w3.org/ns/xproc-step"
    version="3.0" name="generateDocumentation">
  
    <!-- ================================================================== -->
    <!-- PROLOG: -->
    <p:option name="debug" select="'true'"/>
    <p:option name="odd2oddSource" required="true"/>
    <p:option name="odd2liteSource" required="true"/>
    <!--<p:output port="result" primary="true">
        <p:pipe port="result" step="odd2html"/>
    </p:output>-->
    <p:load name="stylesheet-odd2odd">
        <p:with-option name="href" select="$odd2oddSource" /> 
    </p:load>
    <p:load name="stylesheet-odd2lite">
        <p:with-option name="href" select="$odd2liteSource" />
    </p:load>
    <!-- ================================================================== -->
    <!-- BODY: -->
    <p:xslt name="stripper">
        <p:with-input port="source">
            <p:document href="../tei/examples/examples.xml"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/tei-stripper.xsl"/>
        </p:with-input>
   
    </p:xslt>
    <p:store href="../tei/examples/examples.stripped.xml"
             serialization="map{'method':'xml','indent':true()}"/>
    <p:directory-list exclude-filter=".+stripped\.xml$" path="../tei/examples/headers"/>
    <p:for-each>
        <p:with-input select="//c:file"/>
        <p:variable name="filename" select="substring-before(/c:file/@name, '.xml')"/>
        <p:load>
            <p:with-option name="href"
                select="concat('../tei/examples/headers/', $filename, '.xml')"/>
        </p:load>
        <p:xslt>
            <p:with-input port="source"/>
            <p:with-input port="stylesheet">
                <p:document href="../stylesheets/tei-stripper.xsl"/>
            </p:with-input>
            
        </p:xslt>
        <p:store>
            <p:with-option name="href"
                select="concat('../tei/examples/headers/', $filename, '.stripped.xml')"/>
        </p:store>
    </p:for-each>
    <p:xinclude name="include" fixup-xml-base="false" fixup-xml-lang="false">
        <p:with-input port="source">
            <p:document href="../tei/TEILex0.odd" content-type="application/xml"/>
        </p:with-input>
    </p:xinclude>
    <p:choose>
        <p:with-input>
            <p:pipe step="include" port="result"/>
        </p:with-input>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-include"/>
            <p:store href="stores/included.xml"
                     serialization="map{'method':'xml','indent':false()}">
                <p:with-input>
                    <p:pipe step="pass-include" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-include" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
    
    <p:xslt name="odd2odd">
        <p:with-input port="source">
            <p:pipe step="include" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:pipe step="stylesheet-odd2odd" port="result"/>
        </p:with-input>
    </p:xslt>
    <p:choose>
        <p:with-input>
            <p:pipe step="odd2odd" port="result"/>
        </p:with-input>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-odd2odd"/>
            <p:store href="stores/odd2odded.xml"
                     serialization="map{'method':'xml','indent':false()}">
                <p:with-input>
                    <p:pipe step="pass-odd2odd" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-odd2odd" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
    <p:xslt name="xmlbasefix">
        <p:with-input port="source">
            <p:pipe step="odd2odd" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/xmlbase-fix.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:choose>
        <p:with-input>
            <p:pipe step="xmlbasefix" port="result"/>
        </p:with-input>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-xmlbasefix"/>
            <p:store href="stores/xmlbase-fixed.xml"
                     serialization="map{'method':'xml','indent':false()}">
                <p:with-input>
                    <p:pipe step="pass-xmlbasefix" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-xmlbasefix" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
    <p:xslt name="odd2lite">
        <p:with-input port="source">
            <p:pipe step="xmlbasefix" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:pipe step="stylesheet-odd2lite" port="result"/>
        </p:with-input>
    </p:xslt>
    <p:choose>
        <p:with-input>
            <p:pipe step="odd2lite" port="result"/>
        </p:with-input>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-odd2lite"/>
            <p:store href="stores/odd2lit.xml"
                     serialization="map{'method':'xml','indent':true()}">
                <p:with-input>
                    <p:pipe step="pass-odd2lite" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-odd2lite" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
    <p:xslt name="fix-spec">
        <p:with-input port="source">
            <p:pipe step="odd2lite" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/fix-ids-in-spec.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:xslt name="contributors">
        <p:with-input port="source">
            <p:pipe step="fix-spec" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/contributors.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:choose>
        <p:with-input>
            <p:pipe step="contributors" port="result"/>
        </p:with-input>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-contributors"/>
            <p:store href="stores/contributored.xml"
                     serialization="map{'method':'xml','indent':true()}">
                <p:with-input>
                    <p:pipe step="pass-contributors" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-contributors" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
    <p:xslt name="odd2html" version="3.0">
       <p:with-option name="output-base-uri"
            select="resolve-uri('../build/html/', static-base-uri())"/> 
        <p:with-option name="parameters"
            select="map{
                'outputDir': resolve-uri('../build/html/', static-base-uri()),
                'splitLevel': '2',
                'STDOUT' : 'false',
                'pageLayout': 'Complex',
                'verbose' : 'yes',
                'headInXref': 'false',
                'bottomNavigationPanel' :'false',
                'topNavigationPanel' :'false'
            }"/>
        <p:with-input port="source">
            <p:pipe step="contributors" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/html3.xsl"/>  
        </p:with-input>  
    </p:xslt>
    <!-- Clean output directory before writing fresh HTML -->
    <!--This is mainly for local development to avoid having
    stale files when I'm working on the new structure-->
    <p:file-delete href="{resolve-uri('../build/html/', static-base-uri())}"
                   recursive="true"/>
    <p:file-mkdir href="{resolve-uri('../build/html/', static-base-uri())}"/>
    <!-- Store primary result when only a single HTML file is produced -->
    <p:store href="{resolve-uri('../build/html/index.html', static-base-uri())}"
             serialization="map{'method':'xhtml','indent':false()}">
        <p:with-input>
            <p:pipe step="odd2html" port="result"/>
        </p:with-input>
    </p:store>
    <!-- Store all secondary result documents produced by odd2html -->
    <p:for-each>
        <p:with-input>
            <p:pipe step="odd2html" port="secondary" ></p:pipe>
        </p:with-input>
        <p:store serialization="map{'method':'xhtml','indent':false()}">
            <p:with-option name="href" select="base-uri(/*)"/>
        </p:store>
    </p:for-each>
    <!--<p:xslt name="post-process" version="2.0">
        <p:with-input port="source">
            <p:pipe step="odd2html" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../stylesheets/html-post-process.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:store href="../../../docs/pages/TEILex0/TEILex0.html"
             serialization="map{'method':'xhtml','indent':false()}">
        <p:with-input port="source">
            <p:pipe port="result" step="post-process"/>
        </p:with-input>
    </p:store>
   <p:store href="../../../docs/pages/TEILex0/spec.html"
            serialization="map{'method':'xhtml','indent':false()}">
        <p:with-input port="source">
            <p:pipe port="result" step="post-process"/>
        </p:with-input>
    </p:store>-->
</p:declare-step>
