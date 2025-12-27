<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step xmlns:p="http://www.w3.org/ns/xproc"
    version="3.0" type="lex0:debug-store" xmlns:lex0="urn:lex0">
    <p:input port="source" primary="true"/>
    <p:output port="result" primary="true"/>
    <p:option name="debug" select="'false'"/>
    <p:option name="name" required="true"/>
    <p:choose>
        <p:when test="$debug = 'true'">
            <p:identity name="pass-through"/>
            <p:store href="{concat('../stores/', $name, '.stored.xml')}"
                serialization="map{'method':'xml','indent':'true'}">
                <p:with-input>
                    <p:pipe step="pass-through" port="result"/>
                </p:with-input>
            </p:store>
            <p:identity>
                <p:with-input>
                    <p:pipe step="pass-through" port="result"/>
                </p:with-input>
            </p:identity>
        </p:when>
        <p:otherwise>
            <p:identity/>
        </p:otherwise>
    </p:choose>
</p:declare-step>
