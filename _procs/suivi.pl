#!/usr/bin/perl
# Read-only classroom view. Authorization comes exclusively from WIMS's server session.
use strict;
use warnings;
use JSON::PP;
use Encode qw(decode);
use Time::Local qw(timelocal);
use File::Basename qw(dirname);
use File::Temp qw(tempfile);
my $home = dirname(dirname(dirname(dirname(dirname(__FILE__)))));
# Installed at /home/wims/public_html/themes/Nova/_procs/suivi.pl.
my $sid = shift // '';
my $render = (shift // '') eq '--render';
my $now = time;
sub read_file {
    my ($path, $tail) = @_;
    open my $fh, '<:raw', $path or return '';
    if ($tail && -s $fh > 262144) { seek $fh, -262144, 2; scalar <$fh>; }
    local $/; my $s = <$fh> // ''; close $fh;
    return decode('cp1252', $s);
}
sub defs {
    my ($path) = @_; my %v;
    for (split /\n/, read_file($path)) { $v{$1} = $2 if /^(?:!set\s+)?([\w]+)\s*=(.*)$/; }
    return \%v;
}
sub emit {
    my ($data) = @_;
    my $encoder = JSON::PP->new->ascii->canonical->pretty;
    my $json = $encoder->encode($data);
    # !read has a 2 MB working-file limit. Keep a complete snapshot, with an explicit history notice.
    while (length($json) > 1500000 && $data->{students}) {
        my $removed = 0;
        for my $r (@{$data->{students}}) {
            my $n = @{$r->{events}};
            if ($n > 5) { splice @{$r->{events}}, 0, int($n/4) || 1; $r->{historyTruncated}=JSON::PP::true; $removed++; }
        }
        if (!$removed) { $data={error=>'Trop de sessions pour ce releve. Ouvrez le suivi depuis une classe ou un cours.'}; }
        $json = $encoder->encode($data);
    }
    $json =~ s/</\\u003c/g; $json =~ s/>/\\u003e/g; $json =~ s/\$/\\u0024/g;
    my $html = '<script type="application/json" id="nova-suivi-donnees">' . "\n" . $json . '</script>' . "\n";
    if ($render && $sid =~ /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/ && -d "$home/sessions/$sid") {
        # WIMS !sh truncates stdout at 45 KB. Read a multiline, atomically replaced session artifact.
        my ($fh,$tmp) = tempfile('nova-suivi-XXXXXX', DIR=>"$home/sessions/$sid", UNLINK=>0);
        print $fh $html or die 'write snapshot'; close $fh or die 'close snapshot';
        rename $tmp, "$home/sessions/$sid/nova-suivi.phtml" or die 'replace snapshot';
    } else { print $html; }
}
sub valid_class { return defined $_[0] && $_[0] =~ /^\d+(?:\/\d+)*$/; }
sub date_epoch {
    my ($s) = @_;
    return 0 unless $s =~ /^E?(\d{4})(\d\d)(\d\d)\.(\d\d):(\d\d):(\d\d)$/;
    return eval { timelocal($6,$5,$4,$3,$2-1,$1) } // 0;
}
sub epoch { my ($s) = @_; return ($s // '') =~ /=(\d+)$/ ? 0+$1 : 0; }
if ($sid !~ /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/) { emit({error=>'Acces refuse.'}); exit; }
my $viewer = defs("$home/sessions/$sid/var.stat");
my $vc = $viewer->{wims_class} // '';
my $vu = $viewer->{wims_user} // '';
my @scopes;
if (valid_class($vc) && $vu eq 'supervisor') { @scopes = ($vc); }
elsif ($vu ne '' && $vu !~ /^anonymous/ && valid_class($vc)) {
    # authprep stores the full, authenticated list of supervised classes in var.stat.
    @scopes = grep { valid_class($_) } split /[,\s]+/, ($viewer->{wims_supervise} // '');
}
if (!@scopes) { emit({error=>'Acces reserve aux enseignants et administrateurs de leurs classes.'}); exit; }
emit({error=>'Releve indisponible. Actualisez pour reessayer.'}) if $render;
sub allowed {
    my ($c) = @_;
    return 0 unless valid_class($c);
    for (@scopes) { return 1 if $c eq $_ || index($c, "$_/") == 0; }
    return 0;
}
my %students;
opendir my $dh, "$home/sessions" or die 'sessions inaccessible';
while (my $s = readdir $dh) {
    next unless $s =~ /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/;
    next if $s =~ /_(?:check|mhelp|help|tool|test)/;
    my $st = defs("$home/sessions/$s/var.stat");
    my $c = $st->{wims_class} // ''; my $u = $st->{wims_user} // '';
    next unless allowed($c) && $u =~ /^[A-Za-z0-9_.\@-]+$/ && $u ne 'supervisor' && $u !~ /^anonymous/;
    my $owner = $st->{wims_superclass} || $c;
    next unless valid_class($owner);
    my $ud = defs("$home/log/classes/$owner/.users/$u");
    next if ($ud->{user_supervisable} // '') eq 'yes' || ($st->{wims_supervise} // '') ne '';
    my $v = defs("$home/sessions/$s/var");
    my $last = epoch($v->{w_wims_req_time});
    next unless $last && $last <= $now+60;
    my $idle = $st->{wims_idletime} || 5400;
    next if $now-$last > $idle;
    my $key = "$owner:$u";
    next if $students{$key} && $students{$key}{last} >= $last;
    my $exam = $s =~ /_exam/ || ($v->{w_wims_isexam}//'') =~ /^(?:[1-9]\d*|yes)$/;
    my ($sheet,$exo) = ($v->{w_wims_sheet}||0,$v->{w_wims_exo}||0);
    if ($exam && ($v->{w_worksheet}//'') =~ /^(\d+)\.(\d+)$/) { ($sheet,$exo)=($1,$2); }
    $students{$key} = { login=>$u, name=>join(' ', grep { length } ($st->{wims_firstname}//'', $st->{wims_lastname}//'')),
        class=>$c, className=>$st->{wims_classname}//$c, last=>$last,
        module=>$v->{w_module}//'', sheet=>0+$sheet, exo=>0+$exo,
        exam=>$exam ? JSON::PP::true : JSON::PP::false,
        started=>epoch($v->{w_wims_module_start_time}), activity=>$v->{w_title}//'', events=>[] };
}
closedir $dh;
my %titles;
sub activity_title {
    my ($c, $exam, $sheet, $exo) = @_;
    my $k = "$c:$exam:$sheet";
    if (!exists $titles{$k}) {
        my $p = $exam ? "$home/log/classes/$c/exams/.exam$sheet" : "$home/log/classes/$c/sheets/.sheet$sheet";
        my @rec = split /^:/m, read_file($p);
        my @t;
        for my $r (@rec[1..$#rec]) { my @lines = split /\n/, $r; push @t, $lines[$exam ? 2 : 4] // ''; }
        $titles{$k} = \@t;
    }
    return $titles{$k}[$exo-1] || "Exercice $exo";
}
for my $r (values %students) {
    my %seen; my @ev;
    for my $dir ('score', 'noscore') {
        for my $line (split /\n/, read_file("$home/log/classes/$r->{class}/$dir/$r->{login}",1)) {
            my @f = split /\s+/, $line;
            next unless @f >= 5 && $f[4] =~ /^(?:new|renew|score)$/;
            my $t = date_epoch($f[0]); next unless $t >= $now-7200 && $t <= $now+60;
            next unless $f[2] =~ /^\d+$/ && $f[3] =~ /^\d+$/;
            my $e = $f[0] =~ /^E/ ? 1 : 0;
            my $score = $f[4] eq 'score' && ($f[5]//'') =~ /^(?:\d+(?:\.\d*)?|\.\d+)$/ ? 0+$f[5] : undef;
            next if defined($score) && ($score < 0 || $score > 10);
            # Same reply can occur in score/ and noscore/; never count it twice.
            my $key = join(':', @f[0..4], defined($score) ? $score : ''); next if $seen{$key}++;
            push @ev, {at=>$t, kind=>$f[4], exam=>$e?JSON::PP::true:JSON::PP::false,
                sheet=>0+$f[2], exo=>0+$f[3], score=>$score,
                title=>activity_title($r->{class},$e,$f[2],$f[3])};
        }
    }
    @ev = sort { $a->{at}<=>$b->{at} || ($a->{kind} eq 'score') <=> ($b->{kind} eq 'score') } @ev;
    if (@ev > 500) { splice @ev,0,@ev-500; $r->{historyTruncated}=JSON::PP::true; }
    $r->{events} = \@ev;
    $r->{name} ||= $r->{login};
    if ($r->{sheet} && $r->{exo} && $r->{module} !~ /^(?:home|adm\/)/) {
        $r->{activity} = activity_title($r->{class},$r->{exam},$r->{sheet},$r->{exo});
    } else { $r->{activity} = $r->{module} eq 'home' ? 'Accueil' : ($r->{activity} || $r->{module} || 'Activite inconnue'); }
}
emit({now=>$now, students=>[sort {$a->{name} cmp $b->{name}} values %students]});
