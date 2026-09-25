package io.github.chapterlight.reader;
import org.junit.Test;
import static org.junit.Assert.*;

public class UrlPolicyTest {
    @Test public void acceptsOnlyExactHttpsOrigins() {
        assertTrue(UrlPolicy.isReaderUrl("https://archiveofourown.org/works/101?view_adult=true"));
        assertTrue(UrlPolicy.isReaderUrl("https://www.ao3-cn.com/works/42"));
        for (String url : new String[]{"http://archiveofourown.org/", "https://archiveofourown.org.evil.example/", "https://evil@archiveofourown.org/", "file:///data/data/secret", "javascript:alert(1)", "intent://foo", "https://ao3-cn.com:444/", "https://evil.example/"}) {
            assertFalse(url, UrlPolicy.isReaderUrl(url));
        }
        assertFalse(UrlPolicy.isReaderUrl(null));
    }
}
