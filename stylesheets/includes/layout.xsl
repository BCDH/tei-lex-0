<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0" xmlns:teix="http://www.tei-c.org/ns/Examples"
    xmlns:html="http://www.w3.org/1999/xhtml" xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    version="3.0" exclude-result-prefixes="tei teix html">

    <doc xmlns="http://www.oxygenxml.com/ns/doc/xsl">
        <desc>[html] Make a new page using multicolumn layout <param name="currentID">current
                ID</param>
        </desc>
    </doc>
    <xsl:template name="pageLayoutComplex">
        <xsl:param name="currentID"/>
        <html>
            <xsl:call-template name="addLangAtt"/>
            <xsl:variable name="pagetitle">
                <xsl:choose>
                    <xsl:when test="$currentID = ''">
                        <xsl:sequence select="tei:generateTitle(.)"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:choose>
                            <xsl:when test="$currentID = 'current'">
                                <xsl:apply-templates mode="xref" select="."/>
                            </xsl:when>
                            <xsl:when test="count(id($currentID)) &gt; 0">
                                <xsl:for-each select="id($currentID)">
                                    <xsl:apply-templates mode="xref" select="."/>
                                </xsl:for-each>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:apply-templates mode="xpath" select="descendant::text">
                                    <xsl:with-param name="xpath" select="$currentID"/>
                                    <xsl:with-param name="action" select="'header'"/>
                                </xsl:apply-templates>
                            </xsl:otherwise>
                        </xsl:choose>
                        <xsl:text> - </xsl:text>
                        <xsl:sequence select="tei:generateTitle(.)"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:variable>
            <!--
                Head markup (title + CSS links) is built by tei:htmlHead().
                The CSS URLs come from params set in `stylesheets/html3.xsl`:
                  - $cssFile (primary CSS, currently PureCSS CDN)
                  - $cssSecondaryFile (project CSS, currently css/tei.lex0.web.css)
                If you want additional <link> or <script> in <head>, override
                tei:htmlHead() or add a dedicated head hook in your custom XSL.
            -->
            <xsl:sequence select="tei:htmlHead($pagetitle, 4)"/>
            <body>
                <xsl:copy-of select="tei:text/tei:body/@unload"/>
                <xsl:copy-of select="tei:text/tei:body/@onunload"/>
                <xsl:call-template name="bodyMicroData"/>
                <!-- TEI hook for JS-in-body; keep empty here, customize in html3.xsl if needed. -->
                <xsl:call-template name="bodyJavascriptHook"/>
                <!-- TEI hook for extra body-level markup/classes; override in html3.xsl. -->
                <xsl:call-template name="bodyHook"/>
                <xsl:call-template name="mainPage">
                    <xsl:with-param name="currentID">
                        <xsl:value-of select="$currentID"/>
                    </xsl:with-param>
                </xsl:call-template>
                <!-- JS goes in html3.xsl's bodyEndHook (loaded at the end of <body>). -->
                <xsl:call-template name="bodyEndHook"/>
            </body>
        </html>
    </xsl:template>

    <doc xmlns="http://www.oxygenxml.com/ns/doc/xsl">
        <desc>[html] the main page structure</desc>
    </doc>
    <xsl:template name="mainPage">
        <xsl:param name="currentID"/>
        <!--
            This template is used because $pageLayout = 'Complex' in
            `xproc/teilex0.cal3.xpl`. If you change $pageLayout there (or in
            html3.xsl), a different page layout template will be chosen.
        -->
        <div id="layout" class="custom-layout language-xml" xmlns="http://www.w3.org/1999/xhtml">

            <!-- Menu toggle: CSS controls left/overlay behavior for #menu/#menuLink. -->
            <a href="#menu" id="menuLink" class="menu-link" xmlns="http://www.w3.org/1999/xhtml">
                <!-- Hamburger icon -->
                <span/>
            </a>
            <!--
                LEFT MENU CONTAINER:
                - If the TOC/menu appears in the main body, check CSS positioning for #menu
                  and #layout in `assets/css/tei.lex0.web.css` (copied to build/html/css/).
                - The menu content is built from tei:text/tei:front below.
                - Add menu-specific classes here (class="custom-menu ...") for styling hooks.
            -->
            <div id="menu" class="custom-menu" xmlns="http://www.w3.org/1999/xhtml">
                <div class="pure-menu">
                    <div class="pure-menu-heading">
                        <a
                            style="float:right; text-transform:capitalize; margin-right: 0.75em; line-height:30px; vertical-align:middle; font-size:85%; padding: 0"
                            href="#revisionHistory">Version <xsl:value-of select="$version"/></a>
                        <a style="line-height:30px; vertical-align:middle" href="index.html">TEI Lex-0</a>

                    </div>

                    <div class="tei_toc_search">
                        <div class="input-group">
                            <input type="search" placeholder="Search..."
                                onfocus="this.placeholder=''" onblur="this.placeholder='Search...'"
                                class="algo rounded"/>
                        </div>
                    </div>
                    <xsl:call-template name="mainTOC"/>
                </div>

                <ul class="pure-menu-list" xmlns="http://www.w3.org/1999/xhtml"
                    style="position: fixed; bottom: 0; width: 325px;">
                    <li class="dlogo" xmlns="http://www.w3.org/1999/xhtml" style="background: #1a252f">
                        <a href="#" xmlns="http://www.w3.org/1999/xhtml" class="logos">
                            <img src="images/dariah-lr.png" class="pure-img img-hover"/>
                            <img src="images/dariah-lr-blue.png" class="pure-img img"/>
                        </a>
                    </li>
                    <li xmlns="http://www.w3.org/1999/xhtml" style="background: #1a252f">
                        <a href="#" xmlns="http://www.w3.org/1999/xhtml" class="logos">
                            <img src="images/elexis.png" class="pure-img img-hover"/>
                            <img src="images/elexis-blue.png" class="pure-img img"/>
                        </a>
                    </li>
                    <li class="pure-menu-item h2020" xmlns="http://www.w3.org/1999/xhtml" style="background: #1a252f">
                        <p xmlns="http://www.w3.org/1999/xhtml">Co-funded by the Horizon 2020 innovation and research programme of the European Union under grant no. 731015.</p>
                    </li>
                </ul>
            </div>
            
            <div id="main">
                <div class="header">
                    <xsl:call-template name="pageHeader"/>
                </div>
                
                <div class="content">
                    <xsl:call-template name="mainFrame">
                        <xsl:with-param name="currentID" select="$currentID"/>
                    </xsl:call-template>
                   
                </div>
                <div class="footer">
                    This is where the footer goes.
                    <xsl:call-template name="copyrightStatement"></xsl:call-template>
                </div>
            </div>
                
          
            
           
                    <!-- Single-column body layout. -->
           <!-- at the moment this outputs the toc as well need to figure out how to display only main content-->
                    <!--<xsl:call-template name="bodyLayout">
                        <xsl:with-param name="currentID" select="$currentID"/>
                    </xsl:call-template>-->
         
        </div>
    </xsl:template>

</xsl:stylesheet>
