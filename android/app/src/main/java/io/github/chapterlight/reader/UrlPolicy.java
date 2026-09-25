package io.github.chapterlight.reader;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

final class UrlPolicy {
    static final Set<String> HOSTS = java.util.Collections.unmodifiableSet(new java.util.HashSet<>(java.util.Arrays.asList("archiveofourown.org", "www.archiveofourown.org",
            "ao3-cn.com", "www.ao3-cn.com", "ao3.cn", "www.ao3.cn")));

    static boolean isReaderUrl(String raw) {
        try {
            URI uri = URI.create(raw);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo() == null
                    && (uri.getPort() == -1 || uri.getPort() == 443)
                    && uri.getHost() != null && HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT));
        } catch (RuntimeException e) { return false; }
    }

    static boolean isWebUrl(String raw) {
        try {
            URI uri = URI.create(raw);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (RuntimeException e) { return false; }
    }
}
