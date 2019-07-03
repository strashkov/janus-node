#!/bin/sh
set -e

entrypoint()
{
	if [ $# -gt 0 ]; then
		local tmp=$(find  / -type d -path '*/etc/janus' -print -quit 2>/dev/null)
		if [ -z "$tmp" ]; then echo "[ERROR] Can't detect Janus 'sysconfdir'" && exit 1; fi
		echo "[INFO] Remove configuration files from '$tmp' folder"
		rm -rf $tmp/*
		return
	fi

	SCRIPT_PATH="`dirname \"$0\"`"
	cd "$SCRIPT_PATH"

	#
	# This works equally for bash and docker-compose:
	#						   empty	 unset
	#	${VARIABLE:-default}   default	 default
	#	${VARIABLE-default}	   empty	 default
	#	${VARIABLE:?err}	   exit()	 exit()	   --> 'err' message printed
	#	${VARIABLE?err}		   empty	 exit()
	#
	# The Docker supports only {:-default} form and a 'boolean like' variable:
	#						   empty	 unset	  nonempty
	#	${VARIABLE:-default}   default	 default  ${VARIABLE}
	#	${VARIABLE:+value}	   empty	 empty	  value		  <-- boolean
	#
	# Docker-compose
	#	https://docs.docker.com/compose/compose-file/#variable-substitution
	# Docker
	#	https://docs.docker.com/v17.09/engine/reference/builder/#environment-replacement
	# Bash:
	#	http://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_06_02
	#	https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
	#	http://www.tldp.org/LDP/abs/html/parameter-substitution.html
	#	http://wiki.bash-hackers.org/syntax/pe
	#
	assert_must_be_nonempty="error: variable not defined or empty"
	assert_must_be_defined="error: variable not define"
	_=${JANUS_DEBUG_LEVEL:?$assert_must_be_nonempty}
	_=${JANUS_WS_PORT:?$assert_must_be_nonempty}
	_=${JANUS_ICE_LOCAL_IP?$assert_must_be_defined}
	_=${JANUS_ICE_PORT_RANGE?$assert_must_be_defined}
	_=${JANUS_TURN_REST_API?$assert_must_be_defined}
	_=${JANUS_TURN_SERVER?$assert_must_be_defined}
	_=${JANUS_TURN_PORT?$assert_must_be_defined}
	_=${JANUS_NOSIP_LOCAL_IP?$assert_must_be_defined}
	_=${JANUS_NOSIP_PORT_RANGE?$assert_must_be_defined}
	_=${JANUS_LS_HTTP_HOST?$assert_must_be_defined}
	_=${JANUS_LS_HTTP_PORT?$assert_must_be_defined}
	_=${JANUS_PROMETHEUS_HOST?$assert_must_be_defined}
	_=${JANUS_PROMETHEUS_PORT?$assert_must_be_defined}

	set_environment
}

set_environment()
{
	##
	# Janus
	local tmp=$(find / -type d -path '*/etc/janus' -print -quit -maxdepth 6 2>/dev/null)
	if [ -z "$tmp" ]; then 
		echo "[ERROR] Can't detect Janus 'sysconfdir' using  '*/etc/janus' pattern"
		echo "> find  / -type d -path '*/janus'"
		find / -type d -path '*/janus'
		exit 1; 
	fi
	sysconfdir=${tmp%%/janus}
	echo "[INFO] Found 'sysconfdir' as $sysconfdir"

	local tmp=$(find / -type d -path '*/share/janus' -print -quit -maxdepth 6 2>/dev/null)
	if [ -z "$tmp" ]; then echo "[ERROR] Can't detect Janus 'datadir'" && exit 1; fi
	datadir=${tmp%%/janus}
	echo "[INFO] Found 'datadir' as $datadir"

	local tmp=$(find / -type d -path '*/lib64/janus' -print -quit -maxdepth 6 2>/dev/null)
	if [ -z "$tmp" ]; then tmp=$(find  / -type d -path '*/lib/janus' -print -quit 2>/dev/null); fi
	if [ -z "$tmp" ]; then echo "[ERROR] Can't detect Janus 'libdir'" && exit 1; fi
	libdir=${tmp%%/janus}
	echo "[INFO] Found 'libdir' as $libdir"

	debug_level=${JANUS_DEBUG_LEVEL:-'5'}
	debug_timestamps='yes'
	debug_colors='no'
	ice_local_ip=${JANUS_ICE_LOCAL_IP-''}
	ice_port_range=${JANUS_ICE_PORT_RANGE-'11111-22222'}
	full_trickle='true'
	turn_server=${JANUS_TURN_SERVER:-'193.34.145.98'}
	turn_port=${JANUS_TURN_PORT:-'3478'}
	turn_type='udp'
	turn_user=dialog
	turn_pwd=dialog
	turn_rest_api=${JANUS_TURN_REST_API:-''}
	turn_rest_api_key='dialog'
	turn_rest_api_method='GET'
	enable_events='yes'

	##
	# WebSockets transport
	websocket_ws='yes'
	websocket_ws_port=${JANUS_WS_PORT:-'8090'}

	##
	# NoSip
	nosip_local_ip=${JANUS_NOSIP_LOCAL_IP-''}
	nosip_port_range=${JANUS_NOSIP_PORT_RANGE-'33333-44444'}

	cfg_file 'janus'
	cfg_set 'configs_folder' $sysconfdir'/janus'
	cfg_set 'plugins_folder' $libdir'/janus/plugins'
	cfg_set 'transports_folder' $libdir'/janus/transports'
	cfg_set 'events_folder' $libdir'/janus/events'
	cfg_set 'debug_level' $debug_level
	cfg_set 'debug_timestamps' $debug_timestamps
	cfg_set 'debug_colors' $debug_colors
	cfg_set 'rfc_4588' 'yes'
	cfg_set 'interface' $ice_local_ip
	cfg_set 'rtp_port_range' $ice_port_range
	cfg_set 'full_trickle' $full_trickle
	cfg_set 'turn_rest_api' $turn_rest_api
	cfg_set 'turn_rest_api_key' $turn_rest_api_key
	cfg_set 'turn_rest_api_method' $turn_rest_api_method
	cfg_set 'broadcast' $enable_events

	cfg_set 'turn_server' $turn_server
	cfg_set 'turn_port' $turn_port
	cfg_set 'turn_type' $turn_type
	cfg_set 'turn_user' $turn_user
	cfg_set 'turn_pwd' $turn_pwd

	cfg_file 'janus.transport.websockets'
	cfg_set 'ws' $websocket_ws
	cfg_set 'ws_port' $websocket_ws_port

	cfg_file 'janus.plugin.nosip'
	cfg_set 'local_ip' $nosip_local_ip
	cfg_set 'rtp_port_range' $nosip_port_range

	cfg_file 'janus.transport.http'
	cfg_set 'http' 'yes'
	cfg_set 'port' '8088'
	cfg_set 'admin_http' 'yes'
	cfg_set 'admin_port' 7088

	cfg_file 'janus.plugin.videocall'
	cfg_file 'janus.plugin.videoroom'
}

cfg_file()
{
	mkdir -p $sysconfdir'/janus/'
	ext="jcfg"
	export CONFIG_FILE=$sysconfdir'/janus/'$1.$ext
	case "$1" in
		"janus")
			SRC_FILE=$1.$ext.sample.in
			;;
		"janus.transport.websockets")
			SRC_FILE=$1.$ext.sample.in
			;;
		"janus.transport.mqtt")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.plugin.nosip")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.plugin.videocall")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.plugin.videoroom")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.eventhandler.rabbitmqevh")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.eventhandler.mqttevh")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.eventhandler.sampleevh")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.eventhandler.prometheusevh")
			SRC_FILE=$1.$ext.sample
			;;
		"janus.transport.http")
			SRC_FILE=$1.$ext.sample.in
			;;
		*)
			echo 'error: unknown config file name' $1;
			exit 1
			;;
	esac
	cp './'$SRC_FILE $CONFIG_FILE
	echo $CONFIG_FILE':'
}

cfg_set()
{
	grep -q '[ #]*'"$1"' *= *' $CONFIG_FILE
	if [ $? -ne 0 ]; then
		echo error: \'$1\' key not found
		exit 1
	fi
	if [ -n "$2" ] ; then
		sed -i 's![ #]*\('"$1"' *= *\)[^#]*!\1'\""$2"\"'!' $CONFIG_FILE
		echo '    '$1'='$2
	else
		echo '    #'$1'='
		sed -i 's![ #]*\('"$1"' *= *\)[^#]*!#\1!' $CONFIG_FILE
	fi
}

entrypoint $@
