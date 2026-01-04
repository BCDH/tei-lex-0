<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step xmlns:p="http://www.w3.org/ns/xproc" xmlns:c="http://www.w3.org/ns/xproc-step"
    xmlns:lex0="urn:lex0" version="3.0"
    name="generateDocumentation">

    <!-- ================================================================== -->
    <!-- PROLOG: -->
    <p:import href="lib/debug-store.xpl"/>
    <!-- Read debug flag from config/debug.xml (if present); default to false; 
         ignored by git to avoid CI interference. -->
    <p:variable name="debug"
        select="if (doc-available(resolve-uri('config/debug.xml', static-base-uri())))
                then string(doc(resolve-uri('config/debug.xml', static-base-uri()))/config/@debug)
                else 'false'"/>
    <!-- ================================================================== -->
    <!-- BODY: -->
  
    <p:directory-list name="dl" path="../odd/examples" include-filter=".+\.xml$"
        exclude-filter=".+stripped\.xml$" max-depth="unbounded"/>
    <p:make-absolute-uris name="abs" match="@name"/>
    <p:variable name="input-file-count" select="count(//c:file)"/>
    <p:for-each name="tei-stripper">  
        <!-- Explicitly feed ONE listing document into the for-each -->
        <p:with-input select="//c:file"/>
        <!-- in this iteration, the document is a single c:file -->
        <p:variable name="in" select="string(/*/@name)"/>
        <!-- replace trailing .xml with .stripped.xml -->
        <p:variable name="out" select="replace($in, '\.xml$', '.stripped.xml', 'i')"/>
        <p:load href="{$in}" content-type="application/xml"/>
        <p:xslt>
            <p:with-input port="stylesheet" href="../xslt/tei-stripper.xsl"/>
        </p:xslt>
        <p:store name="store-it" href="{$out}"/> 
    </p:for-each>
    <p:count name="n-stored"/>
    <p:group name="do-include">
        <p:output port="result"/>
            <p:if test=". = $input-file-count">
                <p:xinclude name="include" fixup-xml-base="false" fixup-xml-lang="false">
                    <p:with-input port="source">
                        <p:document href="../odd/lex-0.odd" content-type="application/xml"/>
                    </p:with-input>
                </p:xinclude>     
            </p:if>
    </p:group>
    
    <lex0:debug-store name="debug-include">
        <p:with-option name="name" select="'include'"/>
        <p:with-option name="debug" select="$debug"/>
        <p:with-input>
            <p:pipe step="do-include" port="result"/>
        </p:with-input>
    </lex0:debug-store>
    
    <p:xslt name="odd2odd">
        <p:with-input port="source">
            <p:pipe step="debug-include" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/odd2odd.xsl"/>
        </p:with-input>
    </p:xslt>
     
    <lex0:debug-store name="debug-odd2odd">
        <p:with-option name="name" select="'odd2odd'"/>
        <p:with-option name="debug" select="$debug"/>
        <p:with-input>
            <p:pipe step="odd2odd" port="result"/>
        </p:with-input>
    </lex0:debug-store>
    <p:xslt name="xmlbasefix">
        <p:with-input port="source">
            <p:pipe step="debug-odd2odd" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/xmlbase-fix.xsl"/>
        </p:with-input>
    </p:xslt>
    <lex0:debug-store name="debug-xmlbasefix">
        <p:with-option name="name" select="'xmlbasefix'"/>
        <p:with-option name="debug" select="$debug"/>
        <p:with-input>
            <p:pipe step="xmlbasefix" port="result"/>
        </p:with-input>
    </lex0:debug-store>
    <p:xslt name="odd2lite">
        <p:with-input port="source">
            <p:pipe step="debug-xmlbasefix" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/odd2lite.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:xslt name="fix-odd2lite-used-by-classes">
        <p:with-input port="source">
            <p:pipe step="odd2lite" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/fix-odd2lite-used-by-classes.xsl"/>
        </p:with-input>
    </p:xslt>
    <lex0:debug-store name="debug-odd2lite">
        <p:with-option name="name" select="'odd2lite'"/>
        <p:with-option name="debug" select="$debug"/>
        <p:with-input>
            <p:pipe step="fix-odd2lite-used-by-classes" port="result"/>
        </p:with-input>
    </lex0:debug-store>
    <p:xslt name="fix-spec">
        <p:with-input port="source">
            <p:pipe step="debug-odd2lite" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/fix-spec.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:xslt name="expand-intro">
        <p:with-input port="source">
            <p:pipe step="fix-spec" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/expand-intro.xsl"/>
        </p:with-input>
    </p:xslt>
    <lex0:debug-store name="debug-expand-intro">
        <p:with-option name="name" select="'expand-intro'"/>
        <p:with-option name="debug" select="$debug"/>
        <p:with-input>
            <p:pipe step="expand-intro" port="result"/>
        </p:with-input>
    </lex0:debug-store>
    <p:xslt name="odd2html" version="3.0">
        <p:with-option name="output-base-uri"
            select="resolve-uri('../build/html/', static-base-uri())"/>
        <p:with-option name="parameters" select="map{
                'outputDir': resolve-uri('../build/html/', static-base-uri()),
                'splitLevel': '2',
                'STDOUT' : 'false',
                'pageLayout': 'Complex',
                'verbose' : 'yes',
                'headInXref': 'false',
                'outputMethod': 'xhtml',
                'bottomNavigationPanel' :'true',
                'topNavigationPanel' :'true',
                'alignNavigationPanel': 'grid-nav'
           
            }"/>
        <p:with-input port="source">
            <p:pipe step="debug-expand-intro" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/html.xsl"/>
        </p:with-input>
    </p:xslt>
    <p:store href="{resolve-uri('../build/html/index.html', static-base-uri())}"
        serialization="map{'method':'xhtml','indent':false()}">
        <p:with-input>
            <p:pipe step="odd2html" port="result"/>
        </p:with-input>
    </p:store>
    <!-- Store all secondary result documents produced by odd2html -->
    <p:for-each>
        <p:with-input>
            <p:pipe step="odd2html" port="secondary"/>
        </p:with-input>
        <p:store serialization="map{'method':'xhtml','indent':false()}">
            <p:with-option name="href" select="base-uri(/*)"/>
        </p:store>
    </p:for-each>
    
    <!-- Copy CSS/JS assets into build/html -->
    <!--<p:file-mkdir href="{resolve-uri('../build/html/css/', static-base-uri())}"/>
    <p:file-copy>
        <p:with-option name="href"
            select="resolve-uri('../assets/css/tei-print.css', static-base-uri())"/>
        <p:with-option name="target"
            select="resolve-uri('../build/html/css/tei-print.css', static-base-uri())"/>
    </p:file-copy>
    <p:file-copy>
        <p:with-option name="href"
            select="resolve-uri('../assets/css/tei.lex0.web.css', static-base-uri())"/>
        <p:with-option name="target"
            select="resolve-uri('../build/html/css/tei.lex0.web.css', static-base-uri())"/>
    </p:file-copy>
    <p:file-copy>
        <p:with-option name="href"
            select="resolve-uri('../assets/css/prism.css', static-base-uri())"/>
        <p:with-option name="target"
            select="resolve-uri('../build/html/css/prism.css', static-base-uri())"/>
    </p:file-copy>
    <p:file-copy>
        <p:with-option name="href" select="resolve-uri('../assets/css/odd.css', static-base-uri())"/>
        <p:with-option name="target"
            select="resolve-uri('../build/html/css/odd.css', static-base-uri())"/>
    </p:file-copy>
    <p:file-copy>
        <p:with-option name="href" select="resolve-uri('../assets/css/pure.css', static-base-uri())"/>
        <p:with-option name="target"
            select="resolve-uri('../build/html/css/pure.css', static-base-uri())"/>
    </p:file-copy>
    <p:file-mkdir href="{resolve-uri('../build/html/js/', static-base-uri())}"/>
    <p:directory-list path="../assets/js"/>
    <p:for-each>
        <p:with-input select="//c:file"/>
        <p:variable name="asset" select="/c:file/@name"/>
        <p:file-copy>
            <p:with-option name="href"
                select="resolve-uri(concat('../assets/js/', $asset), static-base-uri())"/>
            <p:with-option name="target"
                select="resolve-uri(concat('../build/html/js/', $asset), static-base-uri())"/>
        </p:file-copy>
    </p:for-each>-->
    <!-- Copy image assets into build/html/images -->
    <p:file-mkdir href="{resolve-uri('../build/html/images/', static-base-uri())}"/>
    <p:directory-list path="../assets/images"/>
    <p:for-each>
        <p:with-input select="//c:file"/>
        <p:variable name="asset" select="/c:file/@name"/>
        <p:file-copy>
            <p:with-option name="href"
                select="resolve-uri(concat('../assets/images/', $asset), static-base-uri())"/>
            <p:with-option name="target"
                select="resolve-uri(concat('../build/html/images/', $asset), static-base-uri())"/>
        </p:file-copy>
    </p:for-each>

   

    <!--<p:xslt name="post-process" version="2.0">
        <p:with-input port="source">
            <p:pipe step="odd2html" port="result"/>
        </p:with-input>
        <p:with-input port="stylesheet">
            <p:document href="../xslt/html-post-process.xsl"/>
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
