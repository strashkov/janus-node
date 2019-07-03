FROM centos:7
LABEL version="0.0.1"
LABEL maintainer="Dmitry Yudin <yudind@gmail.com>"

# Install dependencies
###
ARG yum="yum -q -y"
RUN	version_maj=$(rpm -q --qf "%{VERSION}" $(rpm -q --whatprovides redhat-release) | cut -d '.' -f1) && \
	echo "[INFO] Install EPEL-${version_maj} (Extra Packages for Enterprise Linux)" && \
	$yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-${version_maj}.noarch.rpm && \
	$yum clean all > /dev/null && rm -rf /var/cache/yum
RUN $yum install wget net-tools lsof nc which mc && \
	$yum install make gcc gcc-c++ libtool gengetopt autoconf cmake && \
	$yum install \
		gtk-doc \
		gengetopt \
		libconfig-* \
		gettext-* \
		glib2-* \
		gnutls-* \
		openssl-* \
		jansson-* \
		paho-c-* \
		libmicrohttpd-* \
		libcurl-* \
		librabbitmq-* && \
	$yum clean all > /dev/null && rm -rf /var/cache/yum

# Build dependencies not available in rpm
###
ARG prefix=/usr
ARG builddir=/src
WORKDIR $builddir
RUN	git clone --depth 1 -b v2.1.0 https://github.com/cisco/libsrtp && cd $(basename "$_") && \
	./configure --prefix=$prefix --libdir='${prefix}/lib64' --enable-openssl && \
	make -j8 shared_library && make install && rm -rf $builddir/*
RUN	git clone https://github.com/libnice/libnice && cd $(basename "$_") && \
	git checkout 3f54b333525e2a4 && \
	./autogen.sh --prefix=$prefix --libdir='${prefix}/lib64' && \
	make -j8 && make install && rm -rf $builddir/*
RUN	git clone --depth 1 -b v2.4-stable https://github.com/warmcat/libwebsockets && cd $(basename "$_") && \
	mkdir -p build && cd "$_" && cmake -j4 -DCMAKE_INSTALL_PREFIX:PATH=$prefix -DLWS_MAX_SMP=1 -DLIB_SUFFIX=64 .. && \
	make -j8 && make install && rm -rf $builddir/*
###
#required cmake >= 3.5 (too long to build)
#RUN	git clone --depth 1 -b v0.6.0 --recurse-submodules https://github.com/jupp0r/prometheus-cpp && cd $(basename "$_") && \
#	mkdir -p .build && cd "$_" && cmake -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DENABLE_PUSH=OFF -DENABLE_TESTING=OFF .. && \
#	make -j8 && make install && rm -rf $builddir/*
#ARG enable_prometheus=--enable-prometheus-event-handler
###
#RUN	git clone --depth 1 -b release https://github.com/DmitryYudin/janus-gateway && cd $(basename "$_") && \
#RUN	git clone --depth 1 -b prometheus https://github.com/DmitryYudin/janus-gateway && cd $(basename "$_") && \
#RUN	git clone --depth 1 -b v0.4.4 https://github.com/meetecho/janus-gateway && cd $(basename "$_") && \
#RUN	git clone --depth 1 -b v0.4.5 https://github.com/meetecho/janus-gateway && cd $(basename "$_") && \
RUN	git clone --depth 1 -b v0.7.2 https://github.com/meetecho/janus-gateway && cd $(basename "$_") && \
	./autogen.sh && \
	./configure --prefix=$prefix --libdir='${prefix}/lib64' \
		--disable-docs \
		--enable-rest \
		--disable-rabbitmq \
		--disable-unix-sockets \
		--disable-nanomsg \
		--disable-sample-event-handler \
		--disable-rabbitmq-event-handler \
		$enable_prometheus \
		--disable-mqtt \
		--disable-mqtt-event-handler \
		--disable-plugin-audiobridge \
		--disable-plugin-duktape \
		--disable-plugin-echotest \
		--disable-plugin-lua \
		--disable-plugin-recordplay \
		--disable-plugin-sip \
		--disable-plugin-sipre \
		--disable-plugin-streaming \
		--disable-plugin-textroom \
		--enable-plugin-nosip \
		--enable-plugin-videocall \
		--enable-plugin-videoroom \
		--disable-plugin-voicemail && \
	make -j8 && make install && rm -rf $builddir/*
WORKDIR /

# Check we can run default configuration
###
RUN for f in $prefix/etc/janus/*.sample; do cp $f ${f%.sample}; done && \
	if timeout 3 janus; then false; else RETVAL=$?; fi && \
	if [ "$RETVAL" == "124" ]; then echo "[INFO] Everything is allright"; fi && \
	if [ "$RETVAL" != "124" ]; then echo "[ERROR] Something went wrong" && false; fi

# Add configuration scripts and check them workable
###
ADD deploy /deploy
RUN JANUS_DEBUG_LEVEL=5 \
	JANUS_WS_PORT=1234 \
	JANUS_ICE_LOCAL_IP=1.2.3.4 \
	JANUS_ICE_PORT_RANGE= \
	JANUS_TURN_REST_API= \
	JANUS_TURN_SERVER= \
	JANUS_TURN_PORT=3456 \
	JANUS_NOSIP_LOCAL_IP= \
	JANUS_NOSIP_PORT_RANGE= \
	JANUS_LS_HTTP_HOST= \
	JANUS_LS_HTTP_PORT= \
	JANUS_PROMETHEUS_HOST=0.0.0.0 \
	JANUS_PROMETHEUS_PORT=9091 \
	/deploy/config/set_config.sh
RUN	if timeout 3 janus; then false; else RETVAL=$?; fi && \
	if [ "$RETVAL" == "124" ]; then echo "[INFO] Everything is allright"; fi && \
	if [ "$RETVAL" != "124" ]; then echo "[ERROR] Something went wrong" && false; fi
RUN /deploy/config/set_config.sh clean

# That's how we're running
###
expose $JANUS_WS_PORT
expose 7088
CMD /deploy/config/set_config.sh && janus
