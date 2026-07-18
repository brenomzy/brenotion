export const SYNTHETIC_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>BRL
        <BANKACCTFROM>
          <BANKID>000
          <ACCTID>synthetic-account
          <ACCTTYPE>CHECKING
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20260601000000[-3:BRT]
          <DTEND>20260630235959[-3:BRT]
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20260605120000[-3:BRT]
            <TRNAMT>2500.00
            <FITID>synthetic-credit
            <MEMO>Recebimento sintético
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260606120000[-3:BRT]
            <TRNAMT>-123.45
            <FITID>synthetic-debit
            <MEMO>Mercado &amp; feira
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;
